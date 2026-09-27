FROM node:22.17.0-bookworm-slim@sha256:b04ce4ae4e95b522112c2e5c52f781471a5cbc3b594527bcddedee9bc48c03a0

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY config/neon-pilot-root.json ./config/neon-pilot-root.json
COPY src/hosted ./src/hosted
COPY scripts/run-pigboard-host.mjs ./scripts/run-pigboard-host.mjs

USER node
EXPOSE 8080
CMD ["node", "scripts/run-pigboard-host.mjs"]
