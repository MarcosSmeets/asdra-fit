# Sistema de animação dos Adaris

`AdariVisualState` define 18 estados compartilhados entre home e batalha. `animationCatalog.ts` centraliza `SpriteAnimationDefinition` e a sequência antecipação → ação → reação → retorno. `AdariAnimator` executa transformações com `Animated`, sem `setState` por frame, e respeita redução de movimento.

O atlas atual é arte temporária coerente, animada por transformações. O contrato permite substituir cada estado por sprite sheet real sem alterar telas ou regras. Quando um asset falta, o retrato base continua renderizável.

