# Multi-stage build for optimal production image
# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Vite inlines VITE_* at build time — pass these as Docker build args in Coolify.
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG GIT_SHA=unknown
ARG CACHEBUST=2026-08-25-admin-dashboard
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_BUILD_ID=$CACHEBUST
LABEL git.sha=$GIT_SHA
LABEL cache.bust=$CACHEBUST

# Build the application. CACHEBUST / GIT_SHA force a fresh Vite build on Coolify.
RUN echo "Building Rivet client CACHEBUST=$CACHEBUST GIT_SHA=$GIT_SHA" && npm run build

# Stage 2: Production stage
FROM nginx:alpine
ARG GIT_SHA=unknown
LABEL git.sha=$GIT_SHA

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]