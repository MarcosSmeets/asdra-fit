# Plano de Retenção Pós-Campanha

> **Status:** proposta (nada aqui está implementado). Criado em 2026-07-23 a partir da
> avaliação do produto: a campanha tem 3 regiões / 15 adversários e termina; depois dela o
> loop restante é meta semanal + liga + cuidado com o Adari. Para um produto de **hábito**,
> cujo valor real aparece no mês 6, o fim do conteúdo é o principal ponto de churn.

## Princípios (herdados do produto)

1. **Nunca punir.** Nenhum mecanismo de retenção pode gerar culpa, perda ou medo (nada de
   "seu Adari sente sua falta há 3 dias").
2. **Constância > volume.** Conteúdo novo deve recompensar regularidade, não grind.
3. **Offline-first.** Tudo que for possível deve funcionar sem conta e sem rede.
4. **O motor já suporta.** As propostas abaixo usam sistemas existentes (batalha
   determinística por seed, ligas, duelos, Vínculo, alimentos) — pouca engenharia nova.

## Propostas, por ordem de custo/benefício

### 1. Desafio semanal rotativo (baixo custo — recomendado primeiro)

Um adversário "eco" por semana, derivado dos 15 existentes com modificadores (mais veloz,
telegraph mais curto, resistência a DoT). A seed vem de `weekKey` — determinística,
offline, sem servidor. Recompensa: alimento raro + moldura no diário da semana.
**Usa:** engine de batalha, `getWeekBounds`, conteúdo existente.

### 2. Região 4 — "As Bordas" (custo médio de conteúdo)

Mais 5 adversários e um chefe, desbloqueados por **semanas de meta cumprida** (ex.: 4
semanas completas desde o fim da Região 3), não por grind de batalha. Alinha o endgame ao
hábito real. **Usa:** pipeline de conteúdo existente (`content/adversaries.ts`, sprites).

### 3. Ciclos de evolução do Vínculo (baixo custo)

Após a evolução final, marcos de Vínculo (25/50/75/100 mantidos por N semanas) liberam
variações cosméticas do habitat e falas novas. Dá horizonte infinito ao cuidado do Adari
sem poder de combate. **Usa:** sistema de Vínculo + catálogo de falas.

### 4. Torneio de liga mensal (custo médio, exige conta)

A cada 4 semanas, a liga fecha um "ciclo" com um torneio de duelos amistosos entre os
membros (bracket determinístico por seed; sem XP, só um título cosmético no perfil até o
próximo ciclo). Transforma as ligas de placar passivo em compromisso social recorrente.
**Usa:** duelos server-authoritative + temporadas existentes.

### 5. Eventos sazonais (custo alto — mais tarde)

Datas fixas (solstícios, aniversário do app) com adversário especial + alimento exclusivo.
Exige calendário de conteúdo e, idealmente, push. Só faz sentido com base de usuários ativa.

## Sequência recomendada

1 (desafio semanal) → 3 (ciclos de Vínculo) → 2 (Região 4) → 4 (torneio) → 5 (sazonais).

Os itens 1 e 3 dão retenção infinita imediata com custo pequeno e 100% offline; 2 dá um
objetivo de médio prazo; 4 e 5 dependem de massa social e distribuição (EAS/lojas).

## Métricas de sucesso

Com os *insights locais opt-in* (e, futuramente, telemetria agregada opt-in): dias ativos
por semana após o fim da campanha, semanas consecutivas de meta cumprida no mês 2+, e
participação em duelos/torneios por liga.
