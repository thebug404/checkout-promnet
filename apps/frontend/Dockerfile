# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json turbo.json ./

# Copy package manifests for the workspaces needed
COPY packages/wc-unified-checkout/package.json ./packages/wc-unified-checkout/
COPY apps/frontend/package.json ./apps/frontend/

# Install all workspace dependencies from the monorepo root
RUN npm install

# Copy source code for the wc-unified-checkout workspace package
COPY packages/wc-unified-checkout/ ./packages/wc-unified-checkout/

# Build the wc-unified-checkout package so the frontend can resolve it
RUN npm run build --workspace=packages/wc-unified-checkout

# Copy frontend source and config
COPY apps/frontend/ ./apps/frontend/

# Build the React app
RUN npm run build --workspace=apps/frontend


# ---- Stage 2: Serve ----
FROM nginx:alpine

# Install openssl to generate a self-signed certificate for local HTTPS
RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/certs \
    && openssl req -x509 -nodes -days 3650 \
       -newkey rsa:2048 \
       -keyout /etc/nginx/certs/localhost.key \
       -out /etc/nginx/certs/localhost.crt \
       -subj "/CN=localhost" \
       -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Copy built assets from builder stage
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Replace default nginx config with our proxy config
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 8443

CMD ["nginx", "-g", "daemon off;"]
