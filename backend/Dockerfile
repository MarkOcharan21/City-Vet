# Build stage: install prod deps (mas maliit at mas mabilis ang cold start sa Koyeb)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Runtime stage: one small image, no git history / dev deps
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5000
# Koyeb at Railway ay nag-iinject ng sariling $PORT; default 5000 para sa local/XAMPP
CMD ["sh", "-c", "node server.js"]
