.PHONY: up down seed test build clean logs

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

seed:
	docker compose exec backend npx tsx src/lib/seed.ts

test:
	cd backend && npx jest --coverage

clean:
	docker compose down -v --rmi all
	docker volume prune -f

logs:
	docker compose logs -f

restart:
	docker compose restart

status:
	docker compose ps
