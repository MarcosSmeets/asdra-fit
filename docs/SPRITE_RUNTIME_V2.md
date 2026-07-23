# Sprite runtime v2

## Adaris e alimentos

`adari-action-atlas-v2.png` possui oito poses por Adari. Idle alterna dois
quadros; carinho, alimentaÃ§Ã£o, repouso, preparaÃ§Ã£o, ataque e dano selecionam
desenhos prÃ³prios. O atlas de alimentos possui os cinco itens originais em pixel
art e substitui os glifos tipogrÃ¡ficos no inventÃ¡rio e na animaÃ§Ã£o de oferta.

`AtlasFrame` recorta a textura jÃ¡ carregada pelo bundler. A troca de frame ocorre
em baixa frequÃªncia e nÃ£o recria o bitmap. ReduÃ§Ã£o de movimento fixa uma pose.

## Explorador

O renderer usa grade lÃ³gica de 32Ã—48 pixels e blocos inteiros. Corpo, tom de
pele, cabelo traseiro, roupa, rosto e cabelo frontal permanecem independentes;
portanto o retorno Ã  pixel art nÃ£o reintroduz presets fechados no editor.

## Home 2.5D

`AdariHabitat` adiciona sombra de contato, tapete astral, escala de profundidade
e pequenos destinos autÃ´nomos. O Adari explora lateralmente e retorna ao centro
quando o estado Ã© idle; qualquer aÃ§Ã£o pausa a autonomia. Parallax, luz de piso e
primeiro plano continuam no driver nativo.

## Batalha por turnos

O motor determinÃ­stico jÃ¡ era por turnos e foi preservado. A apresentaÃ§Ã£o agora
divide o round em aÃ§Ã£o do jogador e resposta inimiga. Adari e inimigo possuem
quadros de idle, ataque e dano, numa arena diagonal original. Defesa, dano bruto,
bloqueio e dano final derivam do mesmo `BattleEvent`.
