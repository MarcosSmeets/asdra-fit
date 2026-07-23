# AnimaÃ§Ãµes de Meu Adari

## Estado

`MyAdariScreenState` controla disponibilidade da interface e permanece separado de sincronizaÃ§Ã£o. `AdariVisualState` controla a apresentaÃ§Ã£o. A conversa agora possui `talkingReaction`, sem compartilhar implicitamente o estado `curious`.

TransiÃ§Ãµes principais:

- carinho: antecipaÃ§Ã£o, inclinaÃ§Ã£o, escala feliz, brilho e partÃ­culas;
- alimentaÃ§Ã£o: item se aproxima, trÃªs ciclos de mastigaÃ§Ã£o e retorno;
- recusa: item nÃ£o Ã© consumido e o Adari responde com movimento lateral;
- conversa: inclinaÃ§Ã£o da cabeÃ§a, aproximaÃ§Ã£o, brilho e balÃ£o;
- repouso/sono: postura baixa e respiraÃ§Ã£o lenta em loop;
- pÃ³s-atividade: salto curto e celebraÃ§Ã£o;
- idle: respiraÃ§Ã£o e piscar em loops independentes.

O gesto chama a persistÃªncia local depois de iniciar a reaÃ§Ã£o visual. Falha de sync nÃ£o interrompe a animaÃ§Ã£o. `reduceMotion` reduz as transiÃ§Ãµes a poses estÃ¡ticas, e `particlesEnabled` controla apenas ornamentos.

As animaÃ§Ãµes usam `Animated.Value` e `useNativeDriver: true`, exceto a largura da barra de Vida em batalha. NÃ£o hÃ¡ `setState` por frame.
