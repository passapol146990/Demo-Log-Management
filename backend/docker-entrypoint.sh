#!/bin/sh
set -e

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

if [ "$NODE_ENV" = "production" ]; then
  echo "[entrypoint] NODE_ENV=production -> building Next.js..."
  npm run build
  echo "[entrypoint] starting Next.js in production mode (npm run start)..."
  exec npm run start
else
  echo "[entrypoint] NODE_ENV=$NODE_ENV -> starting Next.js in dev mode (npm run dev)..."
  exec npm run dev
fi
