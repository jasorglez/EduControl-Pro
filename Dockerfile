# ── Stage 1: Build Vite frontend ─────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production runtime ───────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Install all deps (tsx is a devDep but needed to run server.ts)
COPY package*.json ./
RUN npm ci

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server.ts tsconfig.json ./

ENV NODE_ENV=production
EXPOSE 80

CMD ["npx", "tsx", "server.ts"]
