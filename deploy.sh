#!/bin/bash
# Script de despliegue — correr en el servidor Linux
# Uso: bash deploy.sh

set -e

echo "📦 Actualizando código..."
git pull origin main

echo "🐳 Rebuilding contenedor..."
docker compose down
docker compose up -d --build

echo "🧹 Limpiando imágenes huérfanas..."
docker image prune -f

echo "✅ Deploy completado — EduControl Pro corriendo en puerto 8060"
docker compose ps
