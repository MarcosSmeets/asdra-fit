#!/bin/sh
# Entrypoint de producao. Existe como script (e nao como `cmd1 && cmd2` inline)
# porque o start command do Railway nem sempre passa por um shell: quando ele e
# executado como argv, o `&&` vira argumento do primeiro binario e a API nunca sobe.
set -e

echo "[entrypoint] aplicando migrations..."
/app/node_modules/.bin/prisma migrate deploy

echo "[entrypoint] iniciando a API..."
exec node dist/main.js
