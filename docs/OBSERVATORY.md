# Observatório

O Observatório substitui o conteúdo visual da antiga Home sem mudar sua rota. Após o onboarding, o Explorador entra em uma sala pessoal curta e explorável, com seu Adari ativo e cinco pontos: Ninho Astral, Mesa de Alimentação, Portal da Jornada, Quadro de Metas e Espelho Astral.

## Fluxos preservados

- O roteamento inicial, autenticação, modo local e onboarding não mudaram.
- Diário, Jornada, Liga e Perfil continuam nas mesmas abas.
- Registrar atividade permanece no menu rápido do Observatório.
- Portal e Quadro abrem as telas existentes; não há campanha ou meta duplicada.
- O Espelho usa o mesmo `user_creature`, as definições versionadas e as habilidades existentes.

## Sessão de jogo

A sessão-alvo é de 30 segundos a 5 minutos. Toque no chão para caminhar; aproxime-se de um alvo para obter um único botão contextual. Um toque direto em alvo próximo também interage. Estado durável é salvo localmente; passos, câmera e animações não são sincronizados.

## Limitações do MVP

- Uma única sala, um avatar padrão e quatro direções visuais.
- Sem decoração livre, mundo aberto, multiplayer, loja ou necessidades punitivas.
- Sons usam um adaptador silencioso até a chegada de arquivos finais.
- O atlas raster original v1 substitui letras/círculos e é consumido por `CharacterSprite`; animações quadro a quadro finais seguem o contrato documentado.
- Movimento, câmera e seguimento usam refs/valores animados; não há `setState` React por frame.
- A sincronização nunca bloqueia a cena nem participa da máquina de runtime.
