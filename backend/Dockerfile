# syntax=docker/dockerfile:1

# Node 24 (matches @types/node ^24). Debian slim, multi-arch (amd64 / arm64).
ARG NODE_IMAGE=node:24-slim

# base: shared by every stage. The port is never fixed here: it comes from PORT
# at run time (env file), so the healthcheck reads the same variable as the API.
FROM ${NODE_IMAGE} AS base
WORKDIR /app
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# development: all dependencies; the code is mounted as a volume by docker-compose.yml.
FROM base AS development
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "start:dev"]

# build: compiles the TypeScript sources into dist/.
FROM development AS build
RUN npm run build

# production: production dependencies and dist/ only, run as the non-root "node" user.
FROM base AS production
ENV NODE_ENV=production
# Public CA bundle of Amazon RDS: with DB_SSL=true the API verifies the RDS
# certificate (typeorm.config.ts). It is not a secret.
# It goes into an existing directory: ADD --chmod would also apply 644 to any
# directory it creates (e.g. /etc/ssl), leaving it unreadable for OpenSSL.
ADD --chmod=644 https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /usr/local/share/rds-global-bundle.pem
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/rds-global-bundle.pem
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
# Migrations run first; the API only starts if they succeed.
CMD ["sh", "-c", "node ./node_modules/typeorm/cli.js migration:run --dataSource dist/config/data-source.js && exec node dist/main.js"]
