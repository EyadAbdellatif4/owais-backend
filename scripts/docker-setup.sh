#!/bin/bash

# Docker setup script for owais-backend
# This script helps with initial setup and running the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== OWAIS Backend Docker Setup ===${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}.env file created. Please update it with your configuration.${NC}\n"
    else
        echo -e "${RED}Error: .env.example not found. Please create .env file manually.${NC}"
        exit 1
    fi
fi

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
}

# Function to start services
start_services() {
    echo -e "${GREEN}Starting Docker containers...${NC}"
    docker-compose up -d postgres redis
    echo -e "${GREEN}Waiting for database to be ready...${NC}"
    sleep 5
}

# Function to run migrations
run_migrations() {
    echo -e "${GREEN}Running database migrations...${NC}"
    docker-compose run --rm app npm run db:migrate
}

# Function to run seeders
run_seeders() {
    echo -e "${GREEN}Running database seeders...${NC}"
    docker-compose run --rm app npm run db:seed
}

# Main menu
case "${1:-}" in
    start)
        check_docker
        start_services
        echo -e "${GREEN}Services started. You can now run: docker-compose up app${NC}"
        ;;
    up)
        check_docker
        docker-compose up
        ;;
    up-d)
        check_docker
        docker-compose up -d
        ;;
    down)
        echo -e "${YELLOW}Stopping all containers...${NC}"
        docker-compose down
        ;;
    restart)
        echo -e "${YELLOW}Restarting containers...${NC}"
        docker-compose restart
        ;;
    logs)
        docker-compose logs -f app
        ;;
    migrate)
        check_docker
        run_migrations
        ;;
    seed)
        check_docker
        run_seeders
        ;;
    setup)
        check_docker
        start_services
        run_migrations
        run_seeders
        echo -e "${GREEN}Setup complete!${NC}"
        echo -e "${GREEN}Run 'docker-compose up' to start the application.${NC}"
        ;;
    shell)
        docker-compose exec app sh
        ;;
    db-shell)
        docker-compose exec postgres psql -U ${DB_USER:-postgres} -d ${DB_DATABASE:-owais_db}
        ;;
    clean)
        echo -e "${YELLOW}Cleaning up containers and volumes...${NC}"
        docker-compose down -v
        echo -e "${GREEN}Cleanup complete.${NC}"
        ;;
    *)
        echo "Usage: $0 {start|up|up-d|down|restart|logs|migrate|seed|setup|shell|db-shell|clean}"
        echo ""
        echo "Commands:"
        echo "  start      - Start database and Redis services only"
        echo "  up         - Start all services (foreground)"
        echo "  up-d       - Start all services (detached)"
        echo "  down       - Stop all services"
        echo "  restart    - Restart all services"
        echo "  logs       - View application logs"
        echo "  migrate    - Run database migrations"
        echo "  seed       - Run database seeders"
        echo "  setup      - Full setup (start services, migrate, seed)"
        echo "  shell      - Open shell in app container"
        echo "  db-shell   - Open PostgreSQL shell"
        echo "  clean      - Remove containers and volumes"
        exit 1
        ;;
esac

