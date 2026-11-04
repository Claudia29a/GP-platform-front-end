# Stage 1: build the Angular app.
FROM node:26-alpine AS build
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
# The base image can lag behind Alpine's security fixes. Afterwards back to the image's non-root user.
USER root
RUN apk upgrade --no-cache
USER 101
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/carebridge-front-end/browser /usr/share/nginx/html

# Every environment sets API_URL, ACCOUNT_API_URL and GOOGLE_CLIENT_ID. There are no defaults on purpose:
# when one is missing, nginx refuses to start instead of using a wrong address.
EXPOSE 8080
