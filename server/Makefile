.PHONY: build-images start stop restart clean

build-images:
	@echo "Building Docker execution images..."
	docker build -t codesaga-node:latest -f docker/node.Dockerfile .
	docker build -t codesaga-python:latest -f docker/python.Dockerfile .
	@echo "Images built successfully"

start:
	@echo "Starting execution server..."
	docker run -d -p 6379:6379 --name codesaga-redis redis:7-alpine || docker start codesaga-redis
	pnpm build
	pnpm start

stop:
	@echo "Stopping services..."
	docker stop codesaga-redis || true

restart: stop start

clean:
	@echo "Cleaning up..."
	docker stop codesaga-redis || true
	docker rm codesaga-redis || true
	docker rmi codesaga-node:latest codesaga-python:latest || true
	rm -rf dist node_modules

dev:
	@echo "Starting in development mode..."
	docker run -d -p 6379:6379 --name codesaga-redis redis:7-alpine || docker start codesaga-redis
	pnpm build
	pnpm dev
