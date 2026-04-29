FROM node:20-alpine

# Create non-root user for sandboxing
# Use a different UID to avoid conflicts with existing users
RUN adduser -D -u 10001 sandbox

# Set working directory
WORKDIR /sandbox

# Switch to non-root user
USER sandbox

# Default command (will be overridden at runtime)
CMD ["node"]
