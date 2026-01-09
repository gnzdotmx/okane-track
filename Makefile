.PHONY: help start build stop restart clean clean-db logs logs-backend logs-frontend logs-db shell-backend shell-frontend shell-db down up rebuild

# Default target
help:
	@echo "Finance App - Available Commands:"
	@echo ""
	@echo "  make start        - Build and start all services"
	@echo "  make build        - Build all Docker images"
	@echo "  make stop         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make down         - Stop and remove containers"
	@echo "  make up           - Start services without building"
	@echo "  make rebuild      - Rebuild and restart services"
	@echo ""
	@echo "  make clean-db     - Remove database volume and restart (resets DB)"
	@echo "  make clean        - Remove all containers, volumes, and networks"
	@echo ""
	@echo "  make logs          - Show logs from all services"
	@echo "  make logs-backend  - Show backend logs"
	@echo "  make logs-frontend - Show frontend logs"
	@echo "  make logs-db       - Show database logs"
	@echo ""
	@echo "  make shell-backend - Open shell in backend container"
	@echo "  make shell-frontend - Open shell in frontend container"
	@echo "  make shell-db      - Open psql shell in database"
	@echo ""

# Build and start all services
start: build
	@echo "Starting Finance App..."
	docker compose up -d
	@echo "Services started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend API: http://localhost:3001"
	@echo "Database: localhost:54320"

# Build all Docker images
build:
	@echo "Building Docker images..."
	docker compose build

# Start services without building
up:
	@echo "Starting services..."
	docker compose up -d

# Stop all services
stop:
	@echo "Stopping services..."
	docker compose stop

# Restart all services
restart: stop up
	@echo "Services restarted!"

# Stop and remove containers
down:
	@echo "Stopping and removing containers..."
	docker compose down

# Rebuild and restart
rebuild: down build up
	@echo "Rebuilt and restarted!"

# Clean database (remove volume and restart)
clean-db:
	@echo "Cleaning database..."
	docker compose down -v
	@echo "Rebuilding and starting with fresh database..."
	docker compose up -d --build
	@echo "Database reset complete!"

# Clean everything (containers, volumes, networks)
clean:
	@echo "Cleaning everything..."
	docker compose down -v --remove-orphans
	@echo "Clean complete!"

# View logs
logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

logs-db:
	docker compose logs -f postgres

# Shell access
shell-backend:
	docker compose exec backend sh

shell-frontend:
	docker compose exec frontend sh

shell-db:
	docker compose exec postgres psql -U postgres -d finance

# Status check
status:
	@echo "Service Status:"
	@docker compose ps

