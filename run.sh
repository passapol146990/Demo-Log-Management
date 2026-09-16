#!/bin/bash
set -e

ENV_FILE=".env"
ACTION=${1:-up}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Copy .env.example to $ENV_FILE and fill in real production values first."
  exit 1
fi

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file $ENV_FILE"

case "$ACTION" in
  up)
    echo "Building production images (NODE_ENV=production, next build + next start)..."
    $COMPOSE build
    echo "Starting Log Management system in production mode..."
    $COMPOSE up -d
    echo "Waiting for services to be ready..."
    sleep 30
    echo "Backend:   http://localhost:3000"
    echo "OpenSearch: http://localhost:9200"
    echo "Syslog:    udp://localhost:514"
    ;;
  down)
    echo "Stopping services..."
    $COMPOSE down
    ;;
  seed)
    echo "Seeding initial data..."
    $COMPOSE exec backend npx tsx src/lib/seed.ts
    ;;
  test)
    echo "Running tests..."
    cd backend && npx jest --coverage
    ;;
  logs)
    $COMPOSE logs -f
    ;;
  restart)
    $COMPOSE restart
    ;;
  status)
    $COMPOSE ps
    ;;
  *)
    echo "Usage: $0 {up|down|seed|test|logs|restart|status}"
    exit 1
    ;;
esac
