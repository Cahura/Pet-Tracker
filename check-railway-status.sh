#!/bin/bash

# Pet Tracker - Railway Status Check

RAILWAY_URL="https://pet-tracker-production.up.railway.app"

echo "🚂 =========================================="
echo "🐾 Pet Tracker - Railway Status Check"
echo "🚂 =========================================="

echo "🔍 Verificando endpoints Railway..."
echo ""

# Verificar Health Check
echo "💚 Verificando Health Check..."
curl -s "$RAILWAY_URL/health" | jq '.' 2>/dev/null || echo "❌ Health check no disponible"
echo ""

# Verificar Frontend
echo "🌐 Verificando Frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend disponible (HTTP $FRONTEND_STATUS)"
else
    echo "❌ Frontend no disponible (HTTP $FRONTEND_STATUS)"
fi
echo ""

# Verificar WebSocket (básico)
echo "🔗 WebSocket endpoint configurado:"
echo "   wss://pet-tracker-production.up.railway.app/ws"
echo ""

echo "🎯 ESP32C6 debe conectarse a:"
echo "   Host: pet-tracker-production.up.railway.app"
echo "   Port: 443"
echo "   Path: /ws"
echo ""

echo "📊 Para monitoreo en tiempo real:"
echo "   1. Acceder a Railway Dashboard"
echo "   2. Ver logs en tiempo real"
echo "   3. Monitorear conexiones WebSocket"
echo ""

echo "🚂 =========================================="
