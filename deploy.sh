#!/bin/bash
# Script de despliegue — correr en el servidor Linux
# Uso: bash deploy.sh

set -e

echo "📦 Actualizando código..."
git pull origin main

echo "🐳 Rebuilding contenedor (sin caché)..."
docker compose down
docker compose build --no-cache
docker compose up -d

echo "🧹 Limpiando imágenes huérfanas..."
docker image prune -f

echo "✅ Deploy completado — EduControl Pro corriendo en puerto 8060"
docker compose ps
