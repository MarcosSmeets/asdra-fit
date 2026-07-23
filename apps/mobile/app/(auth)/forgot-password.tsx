import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Input, Screen, Text } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Placeholder básico (limitação conhecida do MVP): ainda não existe um endpoint
 * de recuperação de senha no backend. Por enquanto, este fluxo apenas exibe uma
 * confirmação neutra — que não revela se o e-mail está cadastrado — sem realizar
 * nenhuma chamada de rede. Integrar com POST /auth/forgot-password quando disponível.
 */
export default function ForgotPassword(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = useCallback((): void => {
    if (email.trim().length === 0) {
      setError('Informe seu e-mail para continuar.');
      return;
    }
    setError(null);
    // MVP: sem chamada ao backend. Mostramos sempre uma mensagem neutra.
    setSubmitted(true);
  }, [email]);

  return (
    <Screen scroll testID="forgot-password-screen">
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="title">Recuperar acesso</Text>
        <Text variant="body" color="textMuted">
          Informe o e-mail da sua conta e enviaremos as instruções para você voltar a acessá-la.
        </Text>
      </View>

      {submitted ? (
        <Card variant="surfaceAlt">
          <Text variant="body" accessibilityLiveRegion="polite">
            Se existir uma conta com este e-mail, você receberá instruções em breve. Confira também a
            caixa de spam.
          </Text>
        </Card>
      ) : (
        <>
          <Input
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="done"
            onSubmitEditing={submit}
            placeholder="voce@exemplo.com"
            error={error ?? undefined}
          />
          <Button
            label="Enviar instruções"
            onPress={submit}
            accessibilityHint="Envia as instruções de recuperação para o e-mail informado."
            testID="forgot-password-submit"
          />
        </>
      )}

      <Text
        variant="label"
        color="primary"
        center
        onPress={() => router.back()}
        accessibilityRole="link"
        accessibilityHint="Volta para a tela de login."
      >
        Voltar para entrar
      </Text>
    </Screen>
  );
}
