# Meu Adari

`/(tabs)` continua sendo a rota interna principal, mas a experiência pública é **Meu Adari**. `MyAdariScreen` reutiliza o cenário do Observatório como fundo e mantém o Adari entre 35% e 50% da altura útil.

As ações Carinho, Alimentar, Conversar, Descansar, Registrar atividade, Passear e Jornada são diretas; não há caminhada nem zona de proximidade na home. Somente assets essenciais bloqueiam a primeira renderização. Falha de sync nunca troca o estado visual da interação por loading.

O retorno de uma atividade usa `reaction=activity` e inicia `excitedAfterActivity`. Acessibilidade mantém botões explícitos como alternativa a gestos.

