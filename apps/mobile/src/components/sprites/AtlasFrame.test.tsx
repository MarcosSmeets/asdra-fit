import React from 'react';
import { Image } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { AtlasFrame } from './AtlasFrame';
import { clearSpriteDiagnostics, readSpriteDiagnostics } from '../../features/diagnostics/spriteDiagnostics';

const ATLAS_A = 1 as never;
const ATLAS_B = 2 as never;

function fireError(): void {
  const image = screen.UNSAFE_getByType(Image);
  act(() => {
    image.props.onError({ nativeEvent: { error: 'ENOENT' } });
  });
}

/** Esgota as tentativas de retry, avançando os timers de backoff. */
function exhaustRetries(): void {
  fireError();
  act(() => { jest.advanceTimersByTime(400); });
  fireError();
  act(() => { jest.advanceTimersByTime(1200); });
  fireError();
}

const props = {
  columns: 8,
  rows: 1,
  column: 0,
  row: 0,
  size: 64,
  atlasAspectRatio: 8,
  accessibilityLabel: 'Adari',
};

beforeEach(() => {
  jest.useFakeTimers();
  clearSpriteDiagnostics();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('AtlasFrame', () => {
  it('tenta de novo antes de desistir, em vez de silenciar na primeira falha', () => {
    render(<AtlasFrame source={ATLAS_A} {...props} />);
    fireError();
    act(() => { jest.advanceTimersByTime(400); });
    // Ainda renderiza a imagem: a primeira falha só agenda nova tentativa.
    expect(screen.UNSAFE_queryByType(Image)).not.toBeNull();
  });

  it('nunca deixa o espaço vazio quando esgota as tentativas', () => {
    render(<AtlasFrame source={ATLAS_A} {...props} />);
    exhaustRetries();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
    // Sem onErrorFallback, o placeholder interno é o piso. Antes, aqui não
    // sobrava nada na tela — que é exatamente o bug relatado.
    expect(screen.getByLabelText('Adari (imagem indisponível)')).toBeTruthy();
  });

  it('usa o onErrorFallback informado quando existe', () => {
    render(
      <AtlasFrame source={ATLAS_A} {...props}
        onErrorFallback={<Image testID="silhueta" source={ATLAS_B} />} />,
    );
    exhaustRetries();
    expect(screen.getByTestId('silhueta')).toBeTruthy();
  });

  it('destrava a falha quando a fonte muda', () => {
    const view = render(<AtlasFrame source={ATLAS_A} {...props} />);
    exhaustRetries();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();

    view.rerender(<AtlasFrame source={ATLAS_B} {...props} />);
    // A trava anterior não podia sobreviver à troca de fonte — era ela que
    // tornava permanente uma falha transitória de carregamento.
    expect(screen.UNSAFE_queryByType(Image)).not.toBeNull();
  });

  it('não reseta a cada frame da animação', () => {
    const view = render(<AtlasFrame source={ATLAS_A} {...props} column={0} />);
    exhaustRetries();
    view.rerender(<AtlasFrame source={ATLAS_A} {...props} column={3} />);
    // Trocar de coluna com o asset indisponível viraria pisca-pisca a cada 150ms.
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });

  it('registra a falha com o erro nativo para diagnóstico', () => {
    render(<AtlasFrame source={ATLAS_A} {...props} tag="adari:solivar:0" />);
    fireError();
    const { failures } = readSpriteDiagnostics();
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ tag: 'adari:solivar:0', error: 'ENOENT', attempt: 0 });
  });
});
