# Interações offline

Carinho, alimentação, conversa, descanso, Vínculo, Saciedade e Vigor seguem: entrada → reação visual imediata → transação SQLite → operação idempotente na outbox → sync silencioso.

Movimento visual, animação, câmera, fala sem recompensa e coordenada de mapa não sincronizam. Falha remota mantém a cena pronta e os dados no dispositivo. Inventário é validado e decrementado na mesma transação da alimentação; recusa não consome item.

