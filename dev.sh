#!/bin/bash
set -e

ACTION=${1:-up}

case "$ACTION" in
  up)
    echo "Starting Log Management system..."
    docker compose up -d
    echo "Waiting for services to be ready..."
    sleep 30
    echo "Backend: http://localhost:3000"
    echo "OpenSearch: http://localhost:9200"
    echo "Syslog: udp://localhost:514"
    ;;
  down)
    echo "Stopping services..."
    docker compose down
    ;;
  seed)
    echo "Seeding initial data..."
    docker compose exec backend npx tsx src/lib/seed.ts
    ;;
  test)
    echo "Running tests..."
    cd backend && npx jest --coverage
    ;;
  logs)
    docker compose logs -f
    ;;
  restart)
    docker compose restart
    ;;
  status)
    docker compose ps
    ;;
  *)
    echo "Usage: $0 {up|down|seed|test|logs|restart|status}"
    exit 1
    ;;
esac
