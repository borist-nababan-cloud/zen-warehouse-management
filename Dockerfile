# ==============================================================================
# Multi-Stage Production Dockerfile for Zen Warehouse Management (WHMS)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Application
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Build Arguments (injected by Coolify during build)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_APP_NAME="Zen Warehouse Management"
ARG VITE_APP_VERSION="1.0.0"
ARG VITE_COMPANY_NAME="Zen Family Spa & Reflexology"
ARG VITE_NAVBAR_TITLE="ZEN WAREHOUSE"
ARG VITE_APP_MODE="PROD"

# Expose build arguments as environment variables for Vite bundle compilation
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_COMPANY_NAME=$VITE_COMPANY_NAME
ENV VITE_NAVBAR_TITLE=$VITE_NAVBAR_TITLE
ENV VITE_APP_MODE=$VITE_APP_MODE

# Copy source code
COPY . .

# Build the production bundle
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Web Server (Nginx Alpine)
# ------------------------------------------------------------------------------
FROM nginx:alpine

# Install curl and wget for reliable container health monitoring
RUN apk add --no-cache curl wget

# Remove default Nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA routing, compression & security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Production Healthcheck
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fs http://127.0.0.1:80/healthz || wget -q -O - http://127.0.0.1:80/healthz || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
