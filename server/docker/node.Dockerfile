FROM node:20-alpine

# Create sandbox directory with world-readable permissions
RUN mkdir -p /sandbox && \
    chmod 755 /sandbox

# Set working directory
WORKDIR /sandbox

# Use the existing node user (UID 1000 in node:alpine)
USER node

# Default command
CMD ["node"]
