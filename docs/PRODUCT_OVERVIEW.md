# Visão do Produto — Asdra Fit

> _Rumo às estrelas através da disciplina diária._

## O que é

**Asdra Fit** — um produto da **Ad Sidera** — é um aplicativo mobile **gratuito** e **local-first** de hábitos, focado em academia, exercícios e esportes. O usuário escolhe uma criatura original, define uma meta semanal, registra treinos com fotos **privadas** e evolui junto com seu companheiro — sozinho, numa campanha offline, ou em ligas privadas com amigos.

O nome remete à ideia de progredir "em direção às estrelas": a criatura acompanha a jornada do usuário e evolui pela **constância**, não pela intensidade extrema.

## Princípios do produto

1. **Privacidade por padrão.** Fotos de treino nunca saem do dispositivo. Só metadados (tipo, duração, intensidade) são sincronizados — e apenas quando há conta.
2. **Funciona offline.** Todo o fluxo principal (onboarding, criatura, registrar treino, diário, campanha, batalha) roda sem internet e sem backend. O backend só existe para contas e ligas.
3. **Incentiva constância, não excesso.** Recompensas têm tetos diários (anti-overtraining). Treinar demais num único dia não "compra" progresso.
4. **Nunca pune.** A criatura nunca morre, adoece, perde nível ou fica triste por ausência. Quebrar uma sequência apenas zera a sequência atual, com mensagem encorajadora.
5. **Monetização honesta, nunca predatória.** Sem paywall, sem pay-to-win, sem compra de progresso. O app se mantém gratuito com **um único banner**, não recompensado, ancorado acima da barra de abas — fora de batalha, onboarding e registro de atividade. Nenhum recurso de jogo (Vigor, XP, evolução) pode ser obtido assistindo anúncio.
6. **Conteúdo 100% original.** Criaturas, nomes, regiões e adversários são autorais; nenhum IP de terceiros é usado.

## Público-alvo

- Pessoas que buscam **criar e manter o hábito** de se exercitar.
- Quem se motiva por **gamificação leve** (evolução, campanha, ligas com amigos) sem pressão estética.
- Quem valoriza **privacidade** e um app que **funciona offline**.

## Pilares de experiência

| Pilar | Descrição |
| --- | --- |
| **Meta semanal** | Objetivo pessoal (ex.: 4 treinos/semana). O progresso é sempre relativo à _própria_ meta. |
| **Criatura companheira** | Evolui com XP, atributos e níveis conforme os treinos registrados. |
| **Campanha offline** | 3 regiões, 15 adversários, batalhas por turnos determinísticas. |
| **Ligas privadas** | Grupos por código de convite; ranking baseado em % da meta pessoal, não em volume absoluto. |

## O que está FORA do escopo (decisões deliberadas)

- **Sem PvP.** O motor de batalha é preparado para dois combatentes, mas não há batalha entre usuários em rede.
- **Sem paywall / assinatura / compras.** Não há compra de energia, XP, itens ou vantagens.
- **Sem anúncios recompensados, intersticiais ou de abertura.** O único formato aceito é o banner ancorado descrito no princípio 5.
- **Sem comparação corporal.** Nada de peso, medidas, fotos "antes/depois" competitivas ou métricas de aparência. Fotos são um diário pessoal privado.
- **Sem perda de nível ou punição.** A criatura nunca regride, morre ou é penalizada por inatividade.
- **Sem ranking por volume absoluto.** O ranking usa o percentual da meta pessoal, para não favorecer quem treina mais horas.
- **Sem coleta invasiva de dados.** Analytics é desativado por padrão; localização é texto livre, nunca coordenadas.

## Documentos relacionados

- [GAME_RULES](GAME_RULES.md) — regras do jogo em linguagem de produto.
- [ARCHITECTURE](ARCHITECTURE.md) — visão técnica do monorepo.
- [PRIVACY](PRIVACY.md) — privacidade e LGPD.
- [DECISIONS](DECISIONS.md) — decisões arquiteturais (DEC-01..DEC-15).
