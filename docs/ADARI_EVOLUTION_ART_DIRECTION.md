# Direcao de arte das evolucoes dos Adaris

Fonte de producao para as nove formas evoluidas do MVP. Quando texto antigo
divergir do atlas base, o atlas `adari-action-atlas-v2.png` prevalece.

Concept sheets aprovadas como referencia de identidade:

- `assets/adari-evolution-concepts/terravok-concept-v1.png`
- `assets/adari-evolution-concepts/lumora-concept-v1.png`
- `assets/adari-evolution-concepts/solivar-concept-v1.png`

Essas imagens nao sao sprites finais. Cada forma ainda precisa ser redesenhada
no grid 64x64 e nas oito poses do contrato descrito em
`assets-source/adaris/README.md`.

## Regras comuns

- Todas as formas continuam quadrupedes; nenhuma evolucao antropomorfica.
- Pixel art 32-bit detalhada, clusters legiveis, contorno local de 1 px.
- Luz superior esquerda, sombras duras e alpha binario.
- Sem sombra de contato, aura, fundo, particulas ou glow embutidos no sprite.
- O manifest controla o crescimento; a figura nao deve ocupar toda a celula.
- Pivo nos pes; asas, chifres, orelhas e caudas nunca tocam a borda.
- As oito poses preservam anatomia, proporcao, paleta e baseline.

## Terravok: Brontu -> Asterhorn

Identidade invariavel: quadrupede baixo e largo, rocha ardósia segmentada,
olhos dourados, cristais ambar, fissuras luminosas e cauda mineral curta.

### Brontar — EV 1

- Silhueta baixa, ombros mais erguidos e patas dianteiras espessas.
- Primeiras bracadeiras douradas, placas nos ombros e brotos de chifre para tras.
- Basalto fosco, cristal facetado e metal astral escovado.
- Postura leal e alerta, com peso a frente.
- Evitar armadura humanoide, escudo portatil e excesso de espinhos.

### Bronterra — EV 2

- Corpo em cunha, peito profundo, patas-coluna e chifres laterais largos.
- Circuitos conectam as placas; peito e antebracos formam um escudo natural.
- Postura de muralha movel, patas abertas e centro protegido.
- Evitar estetica de cavaleiro, cauda longa ou cobertura metalica total.

### Asterhorn — Perfeita

- Cordilheira triangular, ombros montanhosos e quatro ramos de chifre.
- O espaco negativo dos chifres sugere uma estrela; nao usar estrela literal.
- Armadura astral completa, mas segmentada, com constelacoes gravadas.
- Dourado e branco sao acentos; a rocha escura continua dominante.
- Evitar asas, spike clutter, aura circular e chifres cortados.

## Lumora: Velune -> Stridara

Identidade invariavel: quadrupede teal esguio, crista violeta dupla, gema
peitoral, filamentos dourados, juba e cauda de nevoa.

### Velair — EV 1

- Corpo mais longo, pernas atleticas e cauda em espiral compacta.
- Linhas aerodinamicas teal e pequenos winglets de nevoa nos ombros.
- Postura serena, com uma pata avancada.
- Evitar anatomia de cavalo realista, chifre de unicornio ou penas.

### Velustra — EV 2

- Diagonal veloz, torax profundo, pernas longas e cauda de mare.
- Winglets viram fitas medias de energia; marcas seguem o fluxo muscular.
- Teal dominante, cyan nas bordas, violeta pontual e ouro minimo.
- Evitar asas gigantes, pose voadora, chamas e anatomia de dragao.

### Stridara — Perfeita

- Silhueta crescente-cometa: corpo esguio, asas-fita amplas e cauda longa.
- Nucleo opaco com energia sugerida por clusters/dither, nunca gradiente.
- Movimento infinito sob controle; patas ainda tocam o solo.
- Evitar pegasus, neon saturado, transparencia suave e apendices cortados.

## Solivar: Myrin -> Solvyr

Identidade invariavel: felino quadrupede prateado, olhos dourados, orelhas
grandes, asas de pena, cauda fofa, pingente e marcas de constelacao. O violeta
pertence a energia e aos circuitos, nao aos olhos.

### Myrix — EV 1

- Corpo um pouco maior e simetrico; asas medias, menores que o corpo.
- Circuitos violeta ativos e penas com bordas mais organizadas.
- Postura curiosa e disciplinada, orelhas atentas e asas semiabertas.
- Evitar fada, coruja, humanoide, asas enormes e ornamento excessivo.

### Myrandel — EV 2

- Felino mais longo, asas amplas em arco e cauda como contrapeso.
- Armadura leve azul-violeta no peito/raiz das asas e rede de constelacoes.
- Ouro ocupa menos de 10% da area; prata e violeta permanecem dominantes.
- Evitar grifo, anjo, capacete, arma ou armadura pesada.

### Solvyr — Perfeita

- Silhueta losango-cometa, asas varridas para tras e cauda luminosa.
- Raizes emplumadas transitam para pontas de energia pixelada.
- Simetria quase perfeita e somente 3–5 pontos estelares pequenos.
- Patas continuam apoiadas; evitar halo, planetas, aneis e star clutter.

## Escala e anchor

| Estagio | Home | Batalha | Anchor |
|---|---:|---:|---:|
| EV 1 | 0.85 | 0.85 | 0.50 / 0.94 |
| EV 2 | 1.00 | 1.00 | 0.50 / 0.95 |
| Perfeita | 1.15 | 1.10 | 0.50 / 0.96 |

## Gate visual

Antes de trocar o manifest para `v2`, revisar em `/dev/adari-gallery`:

1. as 72 poses em fundo claro e escuro;
2. identidade consistente dentro de cada linha;
3. alpha limpo, sem halo magenta ou antialias;
4. baseline e volume constantes entre as poses;
5. leitura em Home, Linha Evolutiva, cerimonia, Jornada e batalha;
6. diferenca clara entre EV 1, EV 2 e Perfeita sem perder a forma Base.
