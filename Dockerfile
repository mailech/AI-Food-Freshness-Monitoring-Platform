# Multi-stage lightweight Nginx container for Food Freshness Monitoring Platform
FROM nginx:alpine

# Set working directory in container
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy static frontend files, assets, and engines
COPY . .

# Expose HTTP port
EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
