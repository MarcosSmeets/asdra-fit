# Linguagem da Marca — Adaris

## O que são os Adaris
Os companheiros do Ad Sidera se chamam **Adaris**.

- Singular: **Adari**
- Plural: **Adaris**
- Título do usuário: **Explorador**

> Os Adaris são companheiros que despertam e evoluem através da disciplina, da
> constância e das ações reais de seus Exploradores.

## Adaris iniciais
| Arquétipo | Adari | Evolução | Personalidade |
| --- | --- | --- | --- |
| Força | **Brontu** | Asterhorn | Leal, determinado e protetor. |
| Resistência | **Velune** | Stridara | Persistente, sereno e incansável. |
| Equilíbrio | **Myrin** | Solvyr | Curioso, disciplinado e adaptável. |

## Regras de escrita na interface
- Use SEMPRE "Adari" (ou o nome próprio: Brontu, Velune, Myrin, Asterhorn, Stridara, Solvyr).
- Nunca use na UI: Pokémon, Digimon, monstrinho, pet, bicho, monstro de bolso, criatura digital, "criatura".
- O termo genérico é **Adari** ou **companheiro** (quando "companheiro" for adjetivo afetivo, não o substantivo genérico).

Exemplos:
- "Escolha seu primeiro Adari."
- "Seu Adari evolui com você."
- "Brontu está pronto para treinar."
- "Conheça os Adaris da sua jornada."

## Onde os termos vivem (fonte única)
- Termos de marca: `apps/mobile/src/constants/brand.ts` → `BRAND` (`companionSingular`, `companionPlural`, `userTitle`, `appName`, `tagline`) e `companionDisplayName(name)`.
- Nomes próprios dos Adaris: `packages/shared/src/content/creatures.ts` (campo `name` e `evolution.toName`).

## Decisão técnica (sem migração de dados)
Para evitar migração arriscada, as **entidades internas** continuam com os nomes
`Creature`, `CreatureDefinition`, `UserCreature`, e as **keys** internas seguem
`terravok` / `lumora` / `solivar` (+ `montarok` / `pyrelith` / `astravel`). Apenas
os **nomes de exibição** mudaram. Dados locais existentes (com `creatureKey`
antigo) continuam válidos.
