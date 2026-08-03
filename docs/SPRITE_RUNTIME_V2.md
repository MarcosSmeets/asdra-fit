# Sprite runtime v2

## Adaris e alimentos

`adari-action-atlas-v2.png` possui oito poses por Adari. Idle alterna dois
quadros; carinho, alimentação, repouso, preparação, ataque e dano selecionam
desenhos próprios. O atlas de alimentos possui os cinco itens originais em pixel
art e substitui os glifos tipográficos no inventário e na animação de oferta.

`AtlasFrame` recorta a textura já carregada pelo bundler. A troca de frame ocorre
em baixa frequência e não recria o bitmap. Redução de movimento fixa uma pose.

## Explorador

O renderer usa grade lógica de 32Ã—48 pixels e blocos inteiros. Corpo, tom de
pele, cabelo traseiro, roupa, rosto e cabelo frontal permanecem independentes;
portanto o retorno à pixel art não reintroduz presets fechados no editor.

## Home 2.5D

`AdariHabitat` adiciona sombra de contato, tapete astral, escala de profundidade
e pequenos destinos autônomos. O Adari explora lateralmente e retorna ao centro
quando o estado é idle; qualquer ação pausa a autonomia. Parallax, luz de piso e
primeiro plano continuam no driver nativo.

## Batalha por turnos

O motor determinístico já era por turnos e foi preservado. A apresentação agora
divide o round em ação do jogador e resposta inimiga. Adari e inimigo possuem
quadros de idle, ataque e dano, numa arena diagonal original. Defesa, dano bruto,
bloqueio e dano final derivam do mesmo `BattleEvent`.
