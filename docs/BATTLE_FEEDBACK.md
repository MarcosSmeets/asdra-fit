# Feedback de Batalha

## Dados coerentes

`battleVisualFeedback` deriva a apresentaÃ§Ã£o do prÃ³prio `BattleEvent` produzido pelo motor. NÃºmero de dano, escudo e histÃ³rico nÃ£o recalculam a regra na UI.

Para um golpe de 20 com Guarda de 70%:

```text
rawDamage: 20
blockedDamage: 14
damage: 6
```

A cena mostra o dano final `-6`, a legenda `Bloqueado 14` e uma borda de impacto. Enquanto a Guarda aguarda o ataque, a aura pulsa com `Guarda 70%`. O buff some quando o motor consome a defesa.

## SequÃªncia

`preparing â†’ advancing â†’ attacking â†’ impact â†’ targetReaction â†’ returning â†’ idle`

Durante a sequÃªncia, o lock por ref impede segundo comando. Ataques aplicam avanÃ§o, flash, shake e nÃºmero flutuante. VitÃ³ria e derrota continuam usando estados prÃ³prios do Adari. A barra de Vida interpola somente quando o valor muda e respeita reduÃ§Ã£o de movimento.

Pular a animaÃ§Ã£o libera as esperas visuais, sem recalcular ou alterar o resultado determinÃ­stico.
