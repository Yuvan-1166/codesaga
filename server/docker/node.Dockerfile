FROM node:20-alpine

# Create sandbox directory
RUN mkdir -p /sandbox && chmod 755 /sandbox

WORKDIR /sandbox

# Install packages locally for ES module support
RUN npm init -y && \
    npm install \
    express@4.18.2 \
    axios@1.6.0 \
    lodash@4.17.21 \
    && npm cache clean --force

# Set NODE_PATH for both global and local modules
ENV NODE_PATH=/sandbox/node_modules:/usr/local/lib/node_modules

# Use the existing node user
USER node

CMD ["node"]
