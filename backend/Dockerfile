# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# python3/make/g++ are a fallback for better-sqlite3's native addon in case
# no prebuilt binary matches this platform and it must compile from source.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV DB_PATH=/app/data/vouchers.db

COPY package*.json ./
# node_modules is copied as-is from the builder (same base image/arch) so the
# native better-sqlite3 binding compiled there stays valid at runtime.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data

EXPOSE 4000
CMD ["node", "dist/index.js"]
