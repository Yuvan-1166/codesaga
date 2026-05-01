.PHONY: help install build-images build start dev stop restart clean logs test health

# Default target - show help
help:
	@echo "╔════════════════════════════════════════════════════════════╗"
	@echo "║         CodeSaga Execution Server - Makefile               ║"
	@echo "╚════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📦 Setup Commands:"
	@echo "  make install        - Install dependencies"
	@echo "  make build-images   - Build Docker sandbox images (Node.js & Python)"
	@echo "  make build          - Compile TypeScript to JavaScript"
	@echo ""
	@echo "🚀 Server Commands:"
	@echo "  make start          - Build and start the server (production)"
	@echo "  make dev            - Start server in development mode with watch"
	@echo "  make stop           - Stop all services (server & Redis)"
	@echo "  make restart        - Restart all services"
	@echo ""
	@echo "🧪 Testing & Monitoring:"
	@echo "  make test           - Run execution tests"
	@echo "  make test-packages  - Test pre-installed packages"
	@echo "  make health         - Check server health"
	@echo "  make logs           - Show server logs (if running in background)"
	@echo ""
	@echo "🧹 Cleanup:"
	@echo "  make clean          - Remove build artifacts and containers"
	@echo "  make clean-all      - Deep clean (includes node_modules)"
	@echo ""
	@echo "📝 Note: Docker is ONLY used for code sandboxing, not for the server itself"
	@echo ""

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	npm install
	@echo "✅ Dependencies installed"

# Build Docker sandbox images (for code execution only)
build-images:
	@echo "🐳 Building Docker sandbox images..."
	@echo "   These images are used ONLY for isolated code execution"
	@echo "   Installing common packages: express, axios, lodash (Node.js)"
	@echo "   Installing common packages: requests, flask, numpy (Python)"
	@echo ""
	docker build -t codesaga-node:latest -f docker/node.Dockerfile .
	docker build -t codesaga-python:latest -f docker/python.Dockerfile .
	@echo ""
	@echo "✅ Sandbox images built successfully"
	@docker images | grep codesaga

# Compile TypeScript
build:
	@echo "🔨 Building TypeScript..."
	npm run build
	@echo "✅ Build complete"

# Start Redis (required for job queue)
start-redis:
	@echo "🔴 Starting Redis..."
	@docker run -d -p 6379:6379 --name codesaga-redis redis:7-alpine 2>/dev/null || docker start codesaga-redis 2>/dev/null || true
	@sleep 1
	@echo "✅ Redis running on port 6379"

# Start the execution server (production mode)
start: start-redis build
	@echo "🚀 Starting CodeSaga Execution Server..."
	@echo ""
	@echo "   Server will run on: http://localhost:3001"
	@echo "   Press Ctrl+C to stop"
	@echo ""
	npm start

# Development mode with auto-reload
dev: start-redis build
	@echo "🔧 Starting in development mode..."
	@echo ""
	@echo "   Server: http://localhost:3001"
	@echo "   Auto-reload: enabled"
	@echo ""
	npm run dev

# Stop all services
stop:
	@echo "🛑 Stopping services..."
	@docker stop codesaga-redis 2>/dev/null || true
	@pkill -f "node.*dist/index.js" 2>/dev/null || true
	@echo "✅ Services stopped"

# Restart services
restart: stop start

# Run execution tests
test:
	@echo "🧪 Running execution tests..."
	@chmod +x test-execution.sh
	@./test-execution.sh

# Test package availability
test-packages:
	@echo "📦 Testing pre-installed packages..."
	@echo ""
	@echo "Node.js packages:"
	@docker run --rm codesaga-node:latest node -e "console.log('✅ express:', require('express') ? 'installed' : 'missing')"
	@docker run --rm codesaga-node:latest node -e "console.log('✅ axios:', require('axios') ? 'installed' : 'missing')"
	@docker run --rm codesaga-node:latest node -e "console.log('✅ lodash:', require('lodash') ? 'installed' : 'missing')"
	@echo ""
	@echo "Python packages:"
	@docker run --rm codesaga-python:latest python -c "import requests; print('✅ requests: installed')"
	@docker run --rm codesaga-python:latest python -c "import flask; print('✅ flask: installed')"
	@docker run --rm codesaga-python:latest python -c "import numpy; print('✅ numpy: installed')"
	@echo ""
	@echo "✅ All packages available!"

# Check server health
health:
	@echo "🏥 Checking server health..."
	@curl -s http://localhost:3001/api/health | jq '.' 2>/dev/null || curl -s http://localhost:3001/api/health || echo "❌ Server not responding"

# Show logs (if running in background)
logs:
	@echo "📋 Server logs:"
	@tail -f logs/server.log 2>/dev/null || echo "No log file found. Server might be running in foreground."

# Clean build artifacts and containers
clean:
	@echo "🧹 Cleaning up..."
	@docker stop codesaga-redis 2>/dev/null || true
	@docker rm codesaga-redis 2>/dev/null || true
	@rm -rf dist
	@rm -rf /tmp/codesaga/* 2>/dev/null || true
	@echo "✅ Cleanup complete"

# Deep clean (includes node_modules and Docker images)
clean-all: clean
	@echo "🧹 Deep cleaning..."
	@docker rmi codesaga-node:latest codesaga-python:latest 2>/dev/null || true
	@rm -rf node_modules
	@echo "✅ Deep cleanup complete"

# Quick setup for first-time users
setup: install build-images
	@echo ""
	@echo "╔════════════════════════════════════════════════════════════╗"
	@echo "║  ✅ Setup Complete!                                        ║"
	@echo "╚════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Configure .env file (copy from .env.example)"
	@echo "  2. Run: make start"
	@echo ""
