# Animações de Meu Adari

## Estado

`MyAdariScreenState` controla disponibilidade da interface e permanece separado de sincronização. `AdariVisualState` controla a apresentação. A conversa agora possui `talkingReaction`, sem compartilhar implicitamente o estado `curious`.

Transições principais:

- carinho: antecipação, inclinação, escala feliz, brilho e partículas;
- alimentação: item se aproxima, três ciclos de mastigação e retorno;
- recusa: item não é consumido e o Adari responde com movimento lateral;
- conversa: inclinação da cabeça, aproximação, brilho e balão;
- repouso/sono: postura baixa e respiração lenta em loop;
- pós-atividade: salto curto e celebração;
- idle: respiração e piscar em loops independentes.

O gesto chama a persistência local depois de iniciar a reação visual. Falha de sync não interrompe a animação. `reduceMotion` reduz as transições a poses estáticas, e `particlesEnabled` controla apenas ornamentos.

As animações usam `Animated.Value` e `useNativeDriver: true`, exceto a largura da barra de Vida em batalha. Não há `setState` por frame.
