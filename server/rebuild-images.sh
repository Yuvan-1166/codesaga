#!/bin/bash

echo "🐳 Rebuilding Docker images..."

# Build Node.js image
echo "Building codesaga-node:latest..."
docker build -t codesaga-node:latest -f docker/node.Dockerfile .

# Build Python image
echo "Building codesaga-python:latest..."
docker build -t codesaga-python:latest -f docker/python.Dockerfile .

echo "✅ Docker images rebuilt successfully!"
echo ""
echo "Images:"
docker images | grep codesaga
