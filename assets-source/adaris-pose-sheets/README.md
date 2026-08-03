# Folhas finais das evoluções

Fontes geradas em 31/07/2026 com o modo **Generate** do `imagegen`, usando os
concepts de `docs/assets/adari-evolution-concepts/` como referência de identidade.

Cada `pose-sheet-v1.png` contém oito poses em grade 4×2, na ordem:

1. idle;
2. idle-alt;
3. carinho;
4. comendo;
5. descansando;
6. pronto;
7. atacando;
8. dano.

`pnpm pixel-art:adaris:import` remove o chroma, mantém o maior componente de
cada célula e produz as fontes `assets-source/adaris/**/home-actions-v2.png`.
Depois, `pnpm pixel-art:adaris:build` publica atlas, retrato e silhueta em
1×/2×/3×. O manifest só aponta para v2 depois de `pnpm pixel-art:adaris:check`.

Os prompts reproduzíveis estão em [prompts.md](./prompts.md).
