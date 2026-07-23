import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  useWindowDimensions,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { AdariPortrait, Button, CelestialDivider, Screen, StarIcon, Text } from '@/components';
import { BRAND } from '@/constants/brand';
import { useTheme } from '@/theme/ThemeProvider';

type SlideId = 'evolua' | 'acao' | 'estrelas';

interface Slide {
  key: SlideId;
  title: string;
  subtitle: string;
}

const SLIDES: readonly Slide[] = [
  {
    key: 'evolua',
    title: 'Evolua na vida real.',
    subtitle: `Seu ${BRAND.companionSingular} evolui com você.`,
  },
  {
    key: 'acao',
    title: 'Cada ação fortalece sua jornada.',
    subtitle: 'Registrar uma atividade rende XP, que fortalece seus atributos e leva à evolução.',
  },
  {
    key: 'estrelas',
    title: 'Treine, avance e alcance as estrelas.',
    subtitle: 'Enfrente a campanha, desafie adversários e entre em uma liga com amigos.',
  },
];

/** Trio inicial de Adaris (Brontu, Velune, Myrin). */
const TRIO = [
  { key: 'terravok', name: 'Brontu' },
  { key: 'lumora', name: 'Velune' },
  { key: 'solivar', name: 'Myrin' },
] as const;

const FLOW_STEPS = ['Atividade', 'XP', 'Atributos', 'Evolução'] as const;
const FEATURES = ['Campanha', 'Adversário', 'Liga com amigos'] as const;

/** Etiqueta estática (pílula) usada nas sequências visuais da introdução. */
function Tag({ label }: { label: string }): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      style={{
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <Text variant="label" color="primary">
        {label}
      </Text>
    </View>
  );
}

function TrioVisual(): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.md }}>
      {TRIO.map((c) => (
        <View key={c.key} style={{ alignItems: 'center', gap: theme.spacing.xs }}>
          <AdariPortrait creatureKey={c.key} size={92} />
          <Text variant="label" color="textMuted">
            {c.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

function FlowVisual(): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel="Atividade rende XP, que fortalece atributos e leva à evolução."
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
      }}
    >
      {FLOW_STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <Tag label={label} />
          {i < FLOW_STEPS.length - 1 ? (
            <StarIcon size={14} color={theme.colors.brandGold} />
          ) : null}
        </React.Fragment>
      ))}
    </View>
  );
}

function FeaturesVisual(): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
      <AdariPortrait creatureKey="solivar" size={120} mood="ready" evolved />
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: theme.spacing.sm,
        }}
      >
        {FEATURES.map((f) => (
          <Tag key={f} label={f} />
        ))}
      </View>
    </View>
  );
}

function SlideVisual({ id }: { id: SlideId }): React.ReactElement {
  if (id === 'evolua') {
    return <TrioVisual />;
  }
  if (id === 'acao') {
    return <FlowVisual />;
  }
  return <FeaturesVisual />;
}

export default function Intro(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index >= SLIDES.length - 1;

  const goToWelcome = useCallback((): void => {
    router.replace('/(auth)/welcome');
  }, [router]);

  const handleNext = useCallback((): void => {
    if (isLast) {
      goToWelcome();
      return;
    }
    const next = index + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  }, [goToWelcome, index, isLast]);

  const onMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
      setIndex(nextIndex);
    },
    [width],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Slide>): React.ReactElement => (
      <View
        style={{
          width,
          paddingHorizontal: theme.spacing.xl,
          justifyContent: 'center',
          gap: theme.spacing.xl,
        }}
      >
        <SlideVisual id={item.key} />
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="title" center>
            {item.title}
          </Text>
          <CelestialDivider inset={theme.spacing.xxl} />
          <Text variant="body" color="textMuted" center>
            {item.subtitle}
          </Text>
        </View>
      </View>
    ),
    [theme.spacing.md, theme.spacing.xl, theme.spacing.xxl, width],
  );

  return (
    <Screen padded={false} testID="intro-screen">
      <View style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={SLIDES as Slide[]}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        />
      </View>

      <View style={{ padding: theme.spacing.xl, gap: theme.spacing.lg }}>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={`Passo ${index + 1} de ${SLIDES.length}`}
          style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.sm }}
        >
          {SLIDES.map((slide, i) => (
            <View
              key={slide.key}
              style={{
                width: i === index ? 24 : 8,
                height: 8,
                borderRadius: theme.radius.pill,
                backgroundColor: i === index ? theme.colors.primary : theme.colors.track,
              }}
            />
          ))}
        </View>

        <Text variant="caption" color="textMuted" center>
          Não é preciso criar conta para começar.
        </Text>

        <Button
          label={isLast ? 'Começar' : 'Próximo'}
          onPress={handleNext}
          accessibilityHint={
            isLast ? 'Avança para as opções de acesso.' : 'Vai para o próximo slide da introdução.'
          }
          testID="intro-next"
        />
        <Button
          label="Pular"
          variant="ghost"
          onPress={goToWelcome}
          accessibilityHint="Pula a introdução e vai direto para as opções de acesso."
          testID="intro-skip"
        />
      </View>
    </Screen>
  );
}
