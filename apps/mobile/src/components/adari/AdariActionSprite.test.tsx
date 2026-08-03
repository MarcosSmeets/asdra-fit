import React from 'react';
import { Image } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { AdariActionSprite } from './AdariActionSprite';
import { clearSpriteDiagnostics } from '../../features/diagnostics/spriteDiagnostics';

function failCurrentImage(): void {
  const image = screen.UNSAFE_getByType(Image);
  act(() => {
    image.props.onError({ nativeEvent: { error: 'sem resposta do servidor de assets' } });
  });
}

/** O atlas só desiste depois dos dois retries com backoff. */
function exhaustAtlas(): void {
  failCurrentImage();
  act(() => { jest.advanceTimersByTime(400); });
  failCurrentImage();
  act(() => { jest.advanceTimersByTime(1200); });
  failCurrentImage();
}

beforeEach(() => {
  jest.useFakeTimers();
  clearSpriteDiagnostics();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('AdariActionSprite', () => {
  it('cai para a silhueta quando o atlas não carrega', () => {
    render(<AdariActionSprite creatureKey="solivar" state="idle" size={120} stage={0}
      reduceMotion accessibilityLabel="Myrin" />);
    exhaustAtlas();
    // Ainda há imagem na tela: a silhueta assumiu.
    expect(screen.UNSAFE_queryByType(Image)).not.toBeNull();
  });

  it('ainda mostra algo quando a silhueta também falha', () => {
    render(<AdariActionSprite creatureKey="solivar" state="idle" size={120} stage={0}
      reduceMotion accessibilityLabel="Myrin" />);
    exhaustAtlas();
    // A silhueta é outro PNG pelo mesmo transporte: numa falha sistêmica ela cai
    // junto. Antes desta correção, a tela ficava sem imagem nenhuma aqui.
    failCurrentImage();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
    expect(screen.getByLabelText('Myrin (imagem indisponível)')).toBeTruthy();
  });
});
