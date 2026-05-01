FROM python:3.12-alpine

# Install common packages for learning
RUN pip install --no-cache-dir \
    requests==2.31.0 \
    flask==3.0.0 \
    numpy==1.26.0

# Create sandbox directory with world-readable permissions
RUN mkdir -p /sandbox && \
    chmod 755 /sandbox

# Create a non-root user
RUN adduser -D -u 1001 sandbox

# Set working directory
WORKDIR /sandbox

# Switch to sandbox user
USER sandbox

# Default command
CMD ["python3"]
