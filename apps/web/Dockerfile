# Multi-stage build for SalariesSummary Web
FROM node:20-slim AS base

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src/
COPY public ./public/
COPY index.html ./

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS production

# Copy built files to nginx
COPY --from=base /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

