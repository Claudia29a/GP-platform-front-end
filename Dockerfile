# Stage 1: build the Angular app.
FROM node:24-alpine AS build
WORKDIR /app

# Install dependencies first, so this layer is cached until package*.json changes.
COPY package.json package-lock.json ./
# --ignore-scripts: dependencies' install scripts never run during the build.
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY . .
# The production build (the default configuration of "ng build"), using the locally installed Angular CLI.
RUN npm run build

# Stage 2: serve the built files with nginx (runs as a non-root user on port 8080).
FROM nginxinc/nginx-unprivileged:1.31-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/carebridge-front-end/browser /usr/share/nginx/html

# Where nginx forwards /api requests; set per environment.
ENV API_URL=http://localhost:8080
EXPOSE 8080
