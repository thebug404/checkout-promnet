# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json turbo.json ./

# Copy package manifests for the workspaces needed
COPY packages/ui/package.json ./packages/ui/
COPY packages/remix-auth-keycloak/package.json ./packages/remix-auth-keycloak/
COPY apps/web/package.json ./apps/web/

# Install all workspace dependencies from the monorepo root
RUN npm install

# Copy workspace packages source (needed at build time)
COPY packages/ui/ ./packages/ui/
COPY packages/remix-auth-keycloak/ ./packages/remix-auth-keycloak/

# Copy web app source and config
COPY apps/web/ ./apps/web/

# Build the web app
RUN npm run build --workspace=apps/web

# ---- Stage 2: Production ----
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy root manifest and workspace package.json files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/packages/ui/package.json ./packages/ui/
COPY --from=builder /app/packages/remix-auth-keycloak/package.json ./packages/remix-auth-keycloak/

# Install production dependencies only
RUN npm install --omit=dev

# Copy built output
COPY --from=builder /app/apps/web/dist ./apps/web/dist

WORKDIR /app/apps/web

EXPOSE 5173

CMD ["npx", "react-router-serve", "./dist/server/index.js"]