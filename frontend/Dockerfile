# syntax=docker/dockerfile:1

# build: compiles the SPA. The API is called on the same origin (/api), so no
# build-time URL is needed.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# production: Nginx serves dist/ and forwards /api to the API container.
# The port and the API upstream come from WEB_PORT and API_PORT at run time
# (the official image renders /etc/nginx/templates with envsubst).
FROM nginx:1.27-alpine AS production
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO /dev/null "http://127.0.0.1:${WEB_PORT}/" || exit 1
