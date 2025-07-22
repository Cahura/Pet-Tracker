# Pet Tracker - Railway Deployment Guide

## 🚂 Configuración Railway

Este proyecto está configurado específicamente para funcionar con **Railway** y recibir datos del **ESP32C6**.

### 📁 Archivos de Configuración Railway

- `railway.json` - Configuración de deployment
- `nixpacks.toml` - Configuración de build con Nixpacks
- `package.json` - Scripts optimizados para Railway

### 🔧 Variables de Entorno Railway

Railway configura automáticamente:
- `PORT` - Puerto asignado por Railway
- `NODE_ENV=production` - Ambiente de producción
- `RAILWAY_ENVIRONMENT` - Identificador del ambiente Railway

### 🚀 Deployment

1. **Push a GitHub**: Los cambios se despliegan automáticamente
2. **Build Process**: 
   - Instala dependencias del backend
   - Instala dependencias del frontend (Angular)
   - Construye la aplicación Angular
   - Inicia el servidor WebSocket

### 📡 Endpoints Railway

- **Frontend**: `https://[your-railway-domain].railway.app/`
- **WebSocket**: `wss://[your-railway-domain].railway.app/ws`
- **Health Check**: `https://[your-railway-domain].railway.app/health`

### 🎯 ESP32C6 Configuration

El ESP32C6 está configurado para conectarse a:
```cpp
const char* WS_HOST = "pet-tracker-production.up.railway.app";
const int WS_PORT = 443;
const char* WS_PATH = "/ws";
```

### 📊 Monitoreo

- Health checks cada 300 segundos
- Logs detallados de conexiones ESP32C6
- Monitoreo de conexiones WebSocket
- Auto-restart en caso de fallos

### 🔍 Debug

- Logs disponibles en Railway Dashboard
- Monitoreo en tiempo real de conexiones ESP32C6
- Detección automática de dispositivos ESP32

### ⚠️ Importante

- **NO ejecutar localmente** - Diseñado específicamente para Railway
- El ESP32C6 debe conectarse al dominio de Railway
- Usar Railway Dashboard para monitoreo y logs

## 🐾 Flujo de Datos

1. **ESP32C6** → Envía datos GPS/IMU via WebSocket → **Railway Server**
2. **Railway Server** → Procesa y retransmite datos → **Angular Frontend**
3. **Angular Frontend** → Muestra datos en tiempo real en el mapa

## 🛠️ Scripts Disponibles

- `npm run railway:start` - Build y start para Railway
- `npm run railway:dev` - Solo start para Railway
- `npm run logs` - Ver instrucciones para logs
- `npm test` - Tests (actualmente placeholder)

## 📞 Support

Para issues o debugging, revisar:
1. Railway Dashboard logs
2. Health check endpoint
3. WebSocket connections en el servidor
