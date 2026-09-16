# ---------------------------------------------------------------------------
# Frontend image: Vite build served by nginx, which also reverse-proxies /api
# to the backend so the browser sees a single origin (no CORS in production).
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests first so `npm ci` is cached until dependencies change.
COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Empty base URL => same-origin requests, which nginx proxies to the backend.
ENV VITE_API_BASE_URL=""

# Google OAuth client ID for the Consumer "Continue with Google" button.
# A client ID is NOT a secret; safe to bake into the browser bundle. Override
# with:  docker compose build --build-arg VITE_GOOGLE_CLIENT_ID=your-id
ARG VITE_GOOGLE_CLIENT_ID="975876715761-qd6dd3vhjj3f8qom90ijmrm0qkq6g3p2.apps.googleusercontent.com"
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build


# ---------------------------------------------------------------- runtime ---
FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache curl

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
