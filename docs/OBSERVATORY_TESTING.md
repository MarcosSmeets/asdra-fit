# Testes do Observatório

## Cobertura automatizada

- Caracterização: identidade/evolução dos três Adaris, XP, recompensa diária, meta e recuperação de Vigor.
- Domínio compartilhado: perfis distintos, níveis de Vínculo, primeiro/segundo/demais carinhos, teto diário, marcos, clamp 100, cinco alimentos, favoritos, recusa e decaimento offline.
- Espaço: destino válido, colisões, correção de posição, substituição de caminho, câmera/clamp/conversão, profundidade por Y, seguimento, distância, bloqueio, reposicionamento astral e alvo contextual.
- Banco: migrations aditivas, unicidade de interações/inventário e constraints no PostgreSQL.
- Sync: schema Zod, `operationId`, `clientGeneratedId` e recálculo autoritativo no backend.

## Comandos

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @ad-sidera/api prisma:validate
pnpm --filter @ad-sidera/mobile exec expo export --platform android
pnpm --filter @ad-sidera/mobile exec expo export --platform ios
```

## Validação manual recomendada

Em dispositivo intermediário: percorrer todos os móveis, trocar destinos rapidamente, suspender/retomar, alterar fuso, alimentar com inventário 1, repetir carinho, desligar rede, sincronizar novamente, usar leitor de tela e redução de movimento. Medir FPS em build de produção; o ambiente de CI valida bundle, não frame pacing físico.

