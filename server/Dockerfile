FROM node:20-alpine

WORKDIR /app

# Install Docker CLI (needed to interact with Docker socket)
RUN apk add --no-cache docker-cli

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy source code (excluding node_modules via .dockerignore)
COPY tsconfig.json ./
COPY src ./src
COPY docker ./docker

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]
