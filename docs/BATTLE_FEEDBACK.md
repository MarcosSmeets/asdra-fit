# Feedback de Batalha

## Dados coerentes

`battleVisualFeedback` deriva a apresentação do próprio `BattleEvent` produzido pelo motor. Número de dano, escudo e histórico não recalculam a regra na UI.

Para um golpe de 20 com Guarda de 70%:

```text
rawDamage: 20
blockedDamage: 14
damage: 6
```

A cena mostra o dano final `-6`, a legenda `Bloqueado 14` e uma borda de impacto. Enquanto a Guarda aguarda o ataque, a aura pulsa com `Guarda 70%`. O buff some quando o motor consome a defesa.

## Sequência

`preparing â†’ advancing â†’ attacking â†’ impact â†’ targetReaction â†’ returning â†’ idle`

Durante a sequência, o lock por ref impede segundo comando. Ataques aplicam avanço, flash, shake e número flutuante. Vitória e derrota continuam usando estados próprios do Adari. A barra de Vida interpola somente quando o valor muda e respeita redução de movimento.

Pular a animação libera as esperas visuais, sem recalcular ou alterar o resultado determinístico.
