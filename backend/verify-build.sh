#!/bin/bash

echo "🔍 Verificando archivos después del build..."

# Verificar estructura del proyecto
echo "📁 Estructura del proyecto:"
ls -la /app/

# Verificar archivos del backend
echo "📁 Archivos del backend:"
ls -la /app/

# Verificar archivos públicos
echo "📁 Archivos públicos (frontend):"
ls -la /app/public/

# Verificar archivo index.html
if [ -f "/app/public/index.html" ]; then
    echo "✅ index.html encontrado"
else
    echo "❌ index.html NO encontrado"
fi

# Verificar assets
if [ -d "/app/public/assets" ]; then
    echo "✅ Carpeta assets encontrada"
    ls -la /app/public/assets/
else
    echo "❌ Carpeta assets NO encontrada"
fi

echo "🚀 Verificación completa"
