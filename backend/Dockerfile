# syntax=docker/dockerfile:1

# Node 24 (matches @types/node ^24). Debian slim, multi-arch (amd64 / arm64).
ARG NODE_IMAGE=node:24-slim

# development: all dependencies; the code is mounted as a volume by docker-compose.yml.
FROM ${NODE_IMAGE} AS development
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# build: compiles the TypeScript sources into dist/.
FROM development AS build
RUN npm run build

# production: production dependencies and dist/ only, run as the non-root "node" user.
FROM ${NODE_IMAGE} AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
# Migrations run first; the API only starts if they succeed.
CMD ["sh", "-c", "node ./node_modules/typeorm/cli.js migration:run --dataSource dist/config/data-source.js && exec node dist/main.js"]
