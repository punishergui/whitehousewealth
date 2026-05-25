.PHONY: up down build seed logs shell-api shell-frontend reset

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

seed:
	docker compose exec api python seed/seed_demo.py

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

logs-frontend:
	docker compose logs -f frontend

shell-api:
	docker compose exec api bash

shell-frontend:
	docker compose exec frontend sh

reset:
	docker compose down -v
	docker compose up -d

dev-api:
	cd backend && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

install:
	cd frontend && npm install

migrate:
	docker compose exec api alembic upgrade head

migration:
	docker compose exec api alembic revision --autogenerate -m "$(name)"

test-api:
	cd backend && pytest

test-frontend:
	cd frontend && npm test

lint-api:
	cd backend && ruff check . && mypy app/

lint-frontend:
	cd frontend && npm run lint
