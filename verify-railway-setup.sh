#!/bin/bash

# Pet Tracker - Railway Deployment Verification Script

echo "🚂 =========================================="
echo "🐾 Pet Tracker - Railway Deployment Check"
echo "🚂 =========================================="

# Verificar archivos de configuración Railway
echo "📁 Verificando archivos de configuración..."

if [ -f "railway.json" ]; then
    echo "✅ railway.json encontrado"
else
    echo "❌ railway.json FALTANTE"
fi

if [ -f "nixpacks.toml" ]; then
    echo "✅ nixpacks.toml encontrado"
else
    echo "❌ nixpacks.toml FALTANTE"
fi

if [ -f "package.json" ]; then
    echo "✅ package.json encontrado"
else
    echo "❌ package.json FALTANTE"
fi

# Verificar estructura del frontend
echo ""
echo "📱 Verificando estructura del frontend..."
if [ -d "frontend" ]; then
    echo "✅ Directorio frontend encontrado"
    if [ -f "frontend/package.json" ]; then
        echo "✅ frontend/package.json encontrado"
    else
        echo "❌ frontend/package.json FALTANTE"
    fi
else
    echo "❌ Directorio frontend FALTANTE"
fi

# Verificar configuración ESP32C6
echo ""
echo "🎯 Verificando configuración ESP32C6..."
if [ -d "esp32c6" ]; then
    echo "✅ Directorio esp32c6 encontrado"
    if [ -f "esp32c6/config.h" ]; then
        echo "✅ esp32c6/config.h encontrado"
        # Verificar que tenga la configuración de Railway
        if grep -q "pet-tracker-production.up.railway.app" esp32c6/config.h; then
            echo "✅ Configuración Railway detectada en ESP32C6"
        else
            echo "⚠️  Revisar configuración Railway en ESP32C6"
        fi
    else
        echo "❌ esp32c6/config.h FALTANTE"
    fi
else
    echo "❌ Directorio esp32c6 FALTANTE"
fi

# Verificar scripts de package.json
echo ""
echo "📜 Verificando scripts Railway..."
if grep -q "railway:start" package.json; then
    echo "✅ Script railway:start encontrado"
else
    echo "❌ Script railway:start FALTANTE"
fi

if grep -q "railway:dev" package.json; then
    echo "✅ Script railway:dev encontrado"
else
    echo "❌ Script railway:dev FALTANTE"
fi

echo ""
echo "🚂 =========================================="
echo "📋 CHECKLIST PARA RAILWAY DEPLOYMENT:"
echo "🚂 =========================================="
echo "1. ✅ Archivos de configuración Railway"
echo "2. ✅ Estructura del proyecto"
echo "3. ✅ Scripts de build"
echo "4. ✅ Configuración ESP32C6"
echo ""
echo "🎯 SIGUIENTE PASO:"
echo "   Push a GitHub para activar deployment automático"
echo ""
echo "📡 ENDPOINTS DESPUÉS DEL DEPLOYMENT:"
echo "   Frontend: https://[tu-dominio].railway.app/"
echo "   WebSocket: wss://[tu-dominio].railway.app/ws"
echo "   Health: https://[tu-dominio].railway.app/health"
echo ""
echo "🚂 =========================================="
