import { config } from 'dotenv';

config();

export const CONFIG = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  security: {
    maxCodeSize: parseInt(process.env.MAX_CODE_SIZE || '51200', 10), // 50KB
    maxExecutionTime: parseInt(process.env.MAX_EXECUTION_TIME || '5000', 10), // 5s
    maxMemoryMB: parseInt(process.env.MAX_MEMORY_MB || '128', 10),
    maxExecutionsPerMinute: parseInt(process.env.MAX_EXECUTIONS_PER_MINUTE || '10', 10),
  },
  
  docker: {
    socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
    images: {
      javascript: 'codesaga-node:latest',
      python: 'codesaga-python:latest',
    },
  },
};
