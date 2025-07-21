# Pet Tracker – Sistema GPS + IMU en Tiempo Real

<div align="center">
  <img src="./huella.png" alt="Pet Tracker" width="120" height="120">
  
  ![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
  ![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
  ![ESP32](https://img.shields.io/badge/ESP32-000000?style=for-the-badge&logo=espressif&logoColor=white)
  ![Railway](https://img.shields.io/badge/Railway-131415?style=for-the-badge&logo=railway&logoColor=white)
  ![Mapbox](https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white)
</div>

## 🎯 Descripción

Sistema integral de seguimiento GPS + IMU en tiempo real para mascotas, desarrollado con ESP32C6, Angular y Railway WebSocket.

### 🏗️ Arquitectura

```
[ESP32C6 + GPS + IMU] ←--WiFi--→ [Railway WebSocket] ←--WSS--→ [Angular Frontend]
```

- **ESP32C6**: Hardware con GPS NEO-6M + MPU6050 IMU
- **Railway**: Servidor WebSocket en la nube  
- **Frontend**: Angular con Mapbox para visualización

## 🚀 Características

- 📡 **Comunicación en Tiempo Real** - WebSocket nativo con latencia < 50ms
- 🛰️ **GPS de Precisión** - Seguimiento de ubicación exacta
- 🔄 **Análisis IMU** - Detección de actividad (reposo, caminando, corriendo)
- 🗺️ **Mapbox Profesional** - Visualización cartográfica avanzada
- 📱 **Interfaz Moderna** - Diseño Liquid Glass responsive

## 📦 Estructura del Proyecto

```
pet-tracker/
├── frontend/           # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── services/
│   │   │   │   └── websocket.service.ts
│   │   │   └── map/
│   │   │       └── map-simple.ts
│   │   └── environments/
│   └── package.json
├── esp32c6/           # ESP32C6 firmware
│   ├── firmware.ino
│   └── config.h
├── package.json       # Railway configuration
├── railway.json
└── nixpacks.toml
```

## ⚙️ Configuración ESP32C6

1. **Editar credenciales WiFi** en `esp32c6/config.h`:
```cpp
const char* WIFI_SSID = "TU_RED_WIFI";
const char* WIFI_PASSWORD = "TU_PASSWORD";
```

2. **Cargar firmware** en Arduino IDE
3. **Conectar hardware**:
   - GPS NEO-6M: Pines 4/5
   - MPU6050: Pines 6/7 (I2C)

## 🌐 Deployment en Railway

1. **Fork/Clone** este repositorio
2. **Conectar a Railway** desde GitHub
3. **Deploy automático** - Railway detecta configuración
4. **URL generada**: `https://pet-tracker-production.up.railway.app`

### Variables de entorno Railway:
```
NODE_ENV=production
PORT=3000
```

## 🔧 Desarrollo Local

```bash
# Instalar dependencias
cd frontend && npm install

# Desarrollo
npm start

# Build
npm run build:prod
```

## 📊 Datos ESP32C6 → Frontend

```json
{
  "petId": 1,
  "deviceId": "ESP32C6_OPTIMIZED",
  "latitude": -12.046400,
  "longitude": -77.042800,
  "gps_valid": true,
  "activity": "resting",
  "accelerometer": {"x": 0.1, "y": 0.2, "z": 9.8},
  "gyroscope": {"x": 0.01, "y": 0.02, "z": 0.01},
  "battery": 85,
  "temperature": 25.3
}
```

## 🎨 Stack Tecnológico

- **Frontend**: Angular 20 + TypeScript + SCSS
- **Mapa**: Mapbox GL JS
- **Comunicación**: WebSocket nativo
- **Hardware**: ESP32C6 + GPS NEO-6M + MPU6050
- **Cloud**: Railway (WebSocket + Hosting)
- **Build**: Nixpacks

## 📈 Flujo de Datos

1. **ESP32C6** lee GPS + IMU
2. **Envía datos** vía WiFi → Railway WebSocket
3. **Frontend Angular** recibe datos en tiempo real
4. **Mapbox** muestra ubicación y actividad

## 🔒 Características de Seguridad

- Conexión WebSocket segura (WSS)
- Validación de datos GPS
- Filtrado de coordenadas inválidas
- Manejo de reconexión automática

## 📱 Interfaz

- **Mapa Principal**: Ubicación en tiempo real
- **Panel de Estado**: Batería, señal, actividad
- **Historial**: Rutas y actividades
- **Responsive**: Optimizado para móvil/desktop

---

**Desarrollado para Railway deployment con ESP32C6 IoT integration**
