# Guia Visual 2.5D

## ComposiÃ§Ã£o de Meu Adari

`MyAdariScene` separa o cenÃ¡rio em:

1. imagem base do ObservatÃ³rio;
2. plano estelar distante;
3. luz radial intermediÃ¡ria;
4. sombra e personagem;
5. decoraÃ§Ã£o de primeiro plano;
6. efeitos de aÃ§Ã£o;
7. HUD.

Planos distantes e prÃ³ximos oscilam em sentidos opostos por 3â€“4 pixels. A imagem base usa uma ampliaÃ§Ã£o discreta para nÃ£o revelar bordas. Luz, sombra elÃ­ptica, highlights e vinheta criam separaÃ§Ã£o sem mudar a cÃ¢mera frontal.

## OrÃ§amento visual

- no mÃ¡ximo dois loops ambientais simultÃ¢neos;
- transformaÃ§Ãµes e opacidade no driver nativo;
- sem blur em tempo real ou filtros encadeados;
- partÃ­culas estÃ¡ticas em quantidade limitada;
- assets carregados uma vez pelo bundler;
- loops encerrados no unmount.

## Acessibilidade

ReduÃ§Ã£o de movimento congela parallax e loops em um frame legÃ­vel. PartÃ­culas podem ser desativadas separadamente. Contraste do HUD usa superfÃ­cies navy semitransparentes, e nenhum estado depende exclusivamente de cor ou som.
