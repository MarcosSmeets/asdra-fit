# Guia Visual 2.5D

## Composição de Meu Adari

`MyAdariScene` separa o cenário em:

1. imagem base do Observatório;
2. plano estelar distante;
3. luz radial intermediária;
4. sombra e personagem;
5. decoração de primeiro plano;
6. efeitos de ação;
7. HUD.

Planos distantes e próximos oscilam em sentidos opostos por 3â€“4 pixels. A imagem base usa uma ampliação discreta para não revelar bordas. Luz, sombra elíptica, highlights e vinheta criam separação sem mudar a câmera frontal.

## Orçamento visual

- no máximo dois loops ambientais simultâneos;
- transformações e opacidade no driver nativo;
- sem blur em tempo real ou filtros encadeados;
- partículas estáticas em quantidade limitada;
- assets carregados uma vez pelo bundler;
- loops encerrados no unmount.

## Acessibilidade

Redução de movimento congela parallax e loops em um frame legível. Partículas podem ser desativadas separadamente. Contraste do HUD usa superfícies navy semitransparentes, e nenhum estado depende exclusivamente de cor ou som.
