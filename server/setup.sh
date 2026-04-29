#!/bin/bash

echo "🚀 Setting up CodeSaga Execution Server..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not accessible."
    echo ""
    echo "This could mean:"
    echo "  1. Docker is not running - start it with: sudo systemctl start docker"
    echo "  2. Permission denied - add your user to docker group:"
    echo "     sudo usermod -aG docker $USER"
    echo "     newgrp docker"
    echo ""
    echo "After fixing, run this script again."
    exit 1
fi

echo "✅ Docker is installed and running"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your configuration."
fi

# Build Docker images
echo "🐳 Building Docker images..."
pnpm run docker:build

if [ $? -eq 0 ]; then
    echo "✅ Docker images built successfully"
else
    echo "❌ Failed to build Docker images"
    echo ""
    echo "If you see permission errors, run:"
    echo "  sudo usermod -aG docker $USER"
    echo "  newgrp docker"
    echo "Then run this script again."
    exit 1
fi

# Verify images
echo "🔍 Verifying Docker images..."
docker images | grep codesaga

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server:"
echo "  Development: pnpm dev"
echo "  Production:  docker-compose up -d"
echo ""
echo "API will be available at: http://localhost:3001"
