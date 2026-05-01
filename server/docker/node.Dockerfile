FROM node:20-alpine

# Install common packages for learning (as root)
RUN npm install -g \
    express@4.18.2 \
    axios@1.6.0 \
    lodash@4.17.21 \
    && npm cache clean --force

# Create sandbox directory with world-readable permissions
RUN mkdir -p /sandbox && \
    chmod 755 /sandbox

# Set working directory
WORKDIR /sandbox

# Set NODE_PATH so global modules are accessible
ENV NODE_PATH=/usr/local/lib/node_modules

# Use the existing node user (UID 1000 in node:alpine)
USER node

# Default command
CMD ["node"]
