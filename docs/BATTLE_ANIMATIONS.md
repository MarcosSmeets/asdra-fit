# Animações de batalha

A máquina visual usa `idle → preparing → advancing → attacking → impact → targetReaction → returning`, seguida de `idle`, `victory` ou `defeat`. O motor lógico continua puro e só resolve uma vez por comando.

Enquanto a sequência está ativa, novos comandos ficam bloqueados por ref síncrona. “Pular animação” libera a espera corrente e preserva exatamente o mesmo estado lógico. Todos os timers são liberados ao desmontar.

O Adari usa `AdariAnimator`; o adversário mantém atlas original, lunge, impacto, flash e número de dano. A Guarda tem aura explícita. Redução de movimento elimina esperas e deslocamentos, sem ocultar resultado ou histórico.

