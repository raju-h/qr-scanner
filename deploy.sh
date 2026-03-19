#!/usr/bin/env bash
# deploy.sh — One-command deployment to EC2. Pull, build, migrate, restart, healthcheck.
set -euo pipefail

COMPOSE_FILE="docker-compose.production.yml"

echo "==> Pulling latest changes..."
git pull origin main

echo "==> Building Docker images..."
docker compose -f "$COMPOSE_FILE" build --no-cache

echo "==> Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate deploy

echo "==> Restarting services..."
docker compose -f "$COMPOSE_FILE" up -d

echo "==> Waiting for healthcheck..."
sleep 10

HEALTH=$(curl -sf http://localhost:3000 || echo "FAIL")
if [ "$HEALTH" = "FAIL" ]; then
  echo "ERROR: Healthcheck failed! Check logs with: docker compose -f $COMPOSE_FILE logs app"
  exit 1
fi

echo "==> Deployment complete! App is healthy."
