#!/bin/sh
set -e

COMPOSE_FILE="$(dirname "$0")/docker-compose.prod.yml"

echo "[homespace] Pulling latest images..."
sudo docker compose -f "$COMPOSE_FILE" pull

echo "[homespace] Restarting containers..."
sudo docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "[homespace] Done."
sudo docker compose -f "$COMPOSE_FILE" ps
