.PHONY: help install dev build test lint format clean docker-up docker-down

help:
	@echo "ConstructAI Platform - Available commands:"
	@echo "  make install      - Install all dependencies"
	@echo "  make dev          - Start all services in development mode"
	@echo "  make build        - Build all services"
	@echo "  make test         - Run all tests"
	@echo "  make lint         - Lint all code"
	@echo "  make format       - Format all code"
	@echo "  make clean        - Clean all build artifacts"
	@echo "  make docker-up    - Start all services with Docker"
	@echo "  make docker-down  - Stop all Docker services"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

lint:
	npm run lint

format:
	npm run format

clean:
	npm run clean
	rm -rf apps/*/dist apps/web/build services/*/__pycache__

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f
