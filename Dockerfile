# syntax=docker/dockerfile:1.7

# Multi-stage build for the Colyseus game server.

FROM node:20-alpine AS base

# --- deps: cached install -----------------------------------------------
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
# postinstall triggers `prisma generate`; that needs the schema, hence
# copying prisma/ before npm ci.
RUN npm ci

# --- builder: tsc → dist -----------------------------------------------
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runner: production-only deps + compiled JS ------------------------
FROM base AS runner
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production \
    PORT=2567

RUN addgroup -g 1001 -S nodejs && adduser -S colyseus -u 1001

# Reinstall only production deps to drop devDependencies (tsx, vitest, etc.)
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder --chown=colyseus:nodejs /app/dist ./dist

USER colyseus
EXPOSE 2567

CMD ["node", "dist/index.js"]
