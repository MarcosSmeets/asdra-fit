# ADR — Início de batalha por proximidade

Status: proposta para P1 pós-MVP. Não faz parte do gate de lançamento do MVP offline.

## Decisão

A primeira entrega será experimental e somente Android, atrás da feature flag
`EXPO_PUBLIC_ENABLE_PROXIMITY_BATTLES`. Um aparelho atua como leitor NFC e o outro como cartão
virtual via HCE (Host Card Emulation). NFC apenas confirma a intenção de pareamento; a criação e o
estado da batalha continuam no servidor e no motor de batalha existente.

O conteúdo trocado por aproximação será um token opaco criado pelo servidor, de uso único e com
expiração curta. O token não contém id de usuário, nome, e-mail, estado do Adari ou regra de batalha.
O servidor vincula o convite ao anfitrião autenticado e valida expiração, participantes,
incompatibilidade de versão e idempotência antes de abrir a sala. O aceite consome o token e cria a
sala na mesma transação atômica, impedindo reuso, auto-duelo e a corrida entre aceitar e cancelar.

## Fluxo P1

1. O anfitrião solicita um convite e recebe o token opaco.
2. O app anfitrião expõe o token por HCE durante uma janela curta.
3. O convidado inicia a leitura NFC de forma explícita e aproxima os aparelhos.
4. O convidado envia o token ao servidor; ambos recebem o mesmo id de sala.
5. Se NFC não estiver disponível, o mesmo convite pode ser aceito por QR ou código curto.

Estados obrigatórios da UI: verificando suporte, aguardando aproximação, convite recebido,
conectando, expirado, já utilizado, sem internet, cancelado, versão incompatível, NFC desligado,
aparelho sem HCE e pareado. Nenhuma permissão ou configuração de NFC será solicitada no onboarding.

## Limites e gates

- iOS e pares Android/iOS usam QR ou código na P1; não se promete NFC entre quaisquer celulares.
- Requer development build, módulo nativo, backend online e dois aparelhos Android físicos com NFC.
- Logs nunca incluem o token completo nem seu truncamento; armazenar somente hash não reversível
  para correlação.
- Convites e códigos curtos têm rate limit por conta, dispositivo e IP, limite de tentativas e
  resposta uniforme para reduzir enumeração e força bruta.
- Gate de beta: pareamento, expiração, consumo único, cancelamento e fallback validados numa matriz
  mínima de aparelhos, com leitor e HCE alternando os papéis, app em background e tela bloqueada.
- Se o app estiver offline, a opção explica a dependência de conexão e oferece batalha local da
  Jornada; não cria uma sala incompleta.

## Fora da P1

Transporte completo da batalha por NFC, descoberta silenciosa, pareamento iPhone-a-iPhone,
Bluetooth como segundo transporte e matchmaking por proximidade em segundo plano.
