# 🏗️ Arquitectura Simplificada - Pet Tracker

## 📋 Resumen de Cambios

✅ **ELIMINADO**: Servidor backend local (Express.js)  
✅ **MANTENIDO**: Railway WebSocket como servidor único  
✅ **OPTIMIZADO**: Frontend Angular conectado directamente a Railway  
✅ **SIMPLIFICADO**: ESP32C6 → Railway → Frontend (flujo directo)  

## 🔄 Flujo de Datos Actualizado

```
ESP32C6 → WSS://pet-tracker-production.up.railway.app/ws → Angular Frontend
   ↓              ↓                                           ↓
GPS + IMU    Railway WebSocket                           MapBox Display
   ↓              ↓                                           ↓
JSON Data    Real-time Relay                            Live Tracking
```

## 📁 Estructura del Proyecto

```
pet-tracker/
├── esp32c6/              # Firmware ESP32C6
│   ├── firmware.ino      # Código principal optimizado
│   └── README.md         # Configuración hardware
├── frontend/             # Angular Frontend
│   ├── src/
│   │   ├── environments/ # Configuración Railway WebSocket
│   │   └── app/          # Componentes y servicios
│   └── package.json      # Dependencias frontend
├── package.json          # Scripts principales simplificados
├── railway.json          # Configuración Railway
├── nixpacks.toml         # Build configuration
└── Dockerfile           # Container para frontend estático
```

## 🚀 Scripts de Desarrollo

```bash
# Desarrollo local
npm run dev                 # = cd frontend && npm start

# Instalación
npm run install-frontend    # Instalar dependencias Angular

# Build para producción
npm run build:prod          # Build optimizado para Railway

# Limpieza
npm run clean              # Limpiar node_modules
```

## 🌐 Endpoints Activos

- **WebSocket ESP32C6**: `wss://pet-tracker-production.up.railway.app/ws`
- **WebSocket Frontend**: `wss://pet-tracker-production.up.railway.app/ws`
- **Frontend URL**: `https://pet-tracker-production.up.railway.app`

## 🔧 Configuración de Desarrollo

### 1. ESP32C6 Firmware
```cpp
// WebSocket para Railway (único endpoint)
const char* ws_host = "pet-tracker-production.up.railway.app";
const int ws_port = 443;
const char* ws_path = "/ws";
```

### 2. Frontend Environment
```typescript
export const environment = {
  production: false,
  wsUrl: 'wss://pet-tracker-production.up.railway.app/ws',
  mapboxToken: 'pk.eyJ1Ijoia2FsaXRvczAiLCJhIjoiY21jcXp3aWxrMHBiMTJtb3JxNDB0enhuMSJ9.IARuB5IywY0T0h2SA60vLw'
};
```

## ✅ Beneficios de la Simplificación

1. **Menor Complejidad**: Un solo punto de conexión (Railway)
2. **Mejor Performance**: Sin intermediarios ni redirecciones
3. **Fácil Mantenimiento**: Menos archivos de configuración
4. **Costos Reducidos**: No necesidad de servidor adicional
5. **Deploy Simplificado**: Railway maneja todo automáticamente

## 🔍 Testing

Para verificar que todo funciona correctamente:

1. **ESP32C6**: Monitor Serial debe mostrar conexión exitosa a Railway
2. **Frontend**: Consola del navegador debe mostrar WebSocket conectado
3. **Datos**: Las coordenadas GPS deben aparecer en tiempo real en el mapa

## 📝 Notas Importantes

- ⚠️ **WiFi Credentials**: Actualizar `TU_RED_WIFI_REAL` en firmware.ino
- 🔐 **Railway Token**: Incluido en environment.ts (verificar vigencia)
- 🗺️ **MapBox Token**: Configurado y funcionando
- 📡 **WebSocket**: Railway provee el servidor automáticamente
