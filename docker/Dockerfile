# ─────────────────────────────────────────────────────────────────────────────
# Blue Bird Framework — Production Dockerfile
# Node.js 24-alpine for lightweight, production-ready environment
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24.7.0-alpine3.21

# Set environment variables
ENV NODE_ENV=production

WORKDIR /app

# Copy package files first (layer cache optimization)
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy project source
COPY . .

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
