# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy frontend files
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install backend dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy backend source
COPY server/ ./server/

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/server

CMD ["node", "index.js"]
