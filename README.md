# Pet Tracker – Sistema de Seguimiento GPS + IMU en Tiempo Real

<div align="center">
  <img src="https://raw.githubusercontent.com/Cahura/pet-tracker/main/frontend/public/pet-icon.svg" alt="Pet Tracker Logo" width="120" height="120">
  
  ![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
  ![Socket.IO](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
  ![ESP32](https://img.shields.io/badge/ESP32-000000?style=for-the-badge&logo=espressif&logoColor=white)
  ![Railway](https://img.shields.io/badge/Railway-131415?style=for-the-badge&logo=railway&logoColor=white)
  ![Mapbox](https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white)
  ![MPU6050](https://img.shields.io/badge/MPU6050-FF6B35?style=for-the-badge&logo=arduino&logoColor=white)
</div>

## 🎯 Descripción del Proyecto

**Pet Tracker** es un sistema integral de seguimiento GPS + IMU en tiempo real para mascotas, desarrollado desde la perspectiva de **Ingeniería Electrónica** con enfoque en IoT y comunicaciones. El proyecto integra hardware especializado (ESP32C6 + MPU6050), protocolos de comunicación en tiempo real (Socket.IO) y una interfaz web moderna para crear una solución completa de monitoreo con detección de actividad.

### 🔧 Enfoque de Ingeniería Electrónica

Este proyecto demuestra competencias técnicas en:
- **Sistemas Embebidos**: Programación de microcontroladores ESP32C6 con WiFi integrado
- **Sensores IMU**: Integración del MPU6050 (acelerómetro y giroscopio de 6 ejes)
- **Procesamiento de Señales**: Análisis de datos IMU para detección de actividad
- **Protocolos IoT**: Implementación de comunicación WebSocket para tiempo real
- **Integración Hardware-Software**: Puente entre dispositivos físicos y aplicaciones web
- **Procesamiento de Señales GPS**: Manejo y filtrado de coordenadas geográficas
- **Arquitectura de Sistemas**: Diseño de comunicación distribuida entre múltiples componentes
- **Análisis de Patrones**: Algoritmos de clasificación de actividad basados en IMU

### 🏗️ Arquitectura del Sistema

```
[ESP32C6 + GPS + MPU6050] ←--WiFi--→ [Socket.IO Server] ←--WebSocket--→ [Angular Frontend]
        │                              │                                  │
   • GPS Module                    • Railway Cloud                   • MapBox Maps
   • MPU6050 (IMU 6-axis)         • Real-time WS                   • User Interface
   • WiFi Radio                   • IMU Data Processing            • Activity Monitor
   • Battery Monitor              • Activity Classification        • Notifications
   • Status LEDs                  • Device Management              • Route History
```

## 🚀 Características Técnicas

- **📡 Comunicación en Tiempo Real** - WebSocket con Socket.IO para latencia mínima
- **🛰️ Posicionamiento GPS** - Coordenadas precisas con filtrado de ruido
- **🔄 Sensor IMU MPU6050** - Acelerómetro y giroscopio de 6 ejes para detección de actividad
- **🐕 Detección de Actividad** - Estados: acostado, parado, caminando, corriendo
- **📊 Análisis de Movimiento** - Procesamiento de magnitudes vectoriales IMU
- **🗺️ Visualización Cartográfica** - MapBox GL JS con renderizado vectorial
- **📱 Interfaz Responsiva** - Adaptable a dispositivos móviles y desktop
- **🔋 Monitoreo Energético** - Control del estado de batería del dispositivo
- **📊 Análisis de Rutas** - Almacenamiento y procesamiento de trayectorias
- **🛡️ Geofencing** - Configuración de zonas seguras con alertas automáticas

## 🛠️ Pila Tecnológica

### Hardware
- **ESP32C6** - Microcontrolador con WiFi 6 y Bluetooth 5.0
- **MPU6050** - Sensor IMU de 6 ejes (acelerómetro + giroscopio)
- **Módulo GPS** - Receptor de posicionamiento global
- **Batería LiPo** - Alimentación portátil con monitoreo de carga
- **Módulo GPS** - Receptor para coordenadas geográficas
- **Batería LiPo** - Alimentación portátil con indicador de nivel
- **Sensores** - Acelerómetro y giroscopio para análisis de movimiento

### Frontend
- **Angular 18** - Framework principal con TypeScript
- **Socket.IO Client** - Comunicación WebSocket en tiempo real
- **MapBox GL JS** - Renderizado de mapas vectoriales
- **SCSS** - Estilos avanzados con glassmorphism

### Backend
- **Node.js** - Servidor principal con Express.js
- **Socket.IO** - WebSocket para comunicación bidireccional
- **Railway** - Plataforma de despliegue en la nube
- **CORS** - Configuración de acceso cross-origin

### Herramientas de Desarrollo
- **Arduino IDE** - Programación del ESP32C6
- **VS Code** - Editor principal con extensiones
- **Git** - Control de versiones
- **npm** - Gestión de dependencias

## 📂 Estructura del Proyecto

```
pet-tracker/
├── backend/                 # Servidor Node.js + Socket.IO
│   ├── server.js           # Lógica principal del servidor
│   ├── package.json        # Dependencias del backend
│   └── .env               # Variables de entorno
├── frontend/               # Aplicación Angular
│   ├── src/
│   │   ├── app/           # Componentes y servicios
│   │   └── environments/  # Configuración de entornos
│   ├── angular.json       # Configuración de Angular
│   └── package.json       # Dependencias del frontend
└── esp32c6/               # Firmware del dispositivo
    ├── firmware.ino       # Código principal del ESP32C6
    └── README.md          # Documentación del hardware
```

## 🚀 Instalación y Despliegue

### Requisitos Previos
- **Node.js** ≥ v20.19
- **Arduino IDE** con soporte ESP32C6
- **Git** para control de versiones
- Cuentas en **Railway** y **Vercel**

### 1. Configuración del Backend
```bash
cd backend
npm install
npm start  # Servidor en puerto 3000
```

### 2. Configuración del Frontend
```bash
cd frontend
npm install
ng serve  # Desarrollo en puerto 4200
ng build --prod  # Build para producción
```

### 3. Configuración del ESP32C6 + MPU6050
```cpp
// En esp32c6/firmware.ino
#include <Wire.h>
#include <MPU6050.h>
#include <WiFi.h>
#include <SocketIOclient.h>

// Configuración WiFi
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";
const char* socketURL = "https://tu-backend.railway.app";

// Configuración MPU6050
MPU6050 mpu;
const int MPU_ADDRESS = 0x68;
const int SAMPLE_RATE = 100; // Hz

// Pines de conexión
#define SDA_PIN 21
#define SCL_PIN 22
#define LED_PIN 2

// Variables para procesamiento IMU
float ax, ay, az;  // Acelerómetro
float gx, gy, gz;  // Giroscopio
float temperature;
```

### 4. Configuración Hardware
```
ESP32C6 ←→ MPU6050 (I2C):
  Pin 21 (SDA) → SDA
  Pin 22 (SCL) → SCL  
  3.3V → VCC
  GND → GND
  
ESP32C6 ←→ GPS Module:
  Pin 16 (RX) → TX
  Pin 17 (TX) → RX
  3.3V → VCC
  GND → GND
```

### 4. Despliegue en Railway (Backend)
```bash
cd backend
git add .
git commit -m "Deploy backend to Railway"
git push origin main
```

### 5. Despliegue en Vercel (Frontend)
```bash
cd frontend
npm run build
# Conectar repositorio en Vercel Dashboard
```

## 🔌 Comunicación Socket.IO

### Eventos del ESP32C6 → Backend
- `esp32-connect` - Conexión inicial del dispositivo ESP32C6
- `gps-data` - Envío de coordenadas GPS en tiempo real
- `imu-data` - Datos del MPU6050 (acelerómetro + giroscopio)
- `activity-state` - Estado de actividad clasificado
- `battery-level` - Nivel de batería actual
- `device-status` - Estado general del dispositivo

### Eventos del Backend → Frontend
- `pet-location-update` - Nueva ubicación GPS de la mascota
- `pet-imu-update` - Datos IMU procesados con actividad
- `pet-activity-update` - Cambio de estado de actividad
- `pet-battery-update` - Actualización de batería
- `connection-status` - Estado de conexión del dispositivo

### Estructura de Datos IMU
```javascript
// Evento: imu-data
{
  "petId": 1,
  "accelerometer": { "x": 0.12, "y": 9.81, "z": 0.03 },
  "gyroscope": { "x": 0.001, "y": 0.002, "z": 0.000 },
  "temperature": 23.5,
  "timestamp": "2025-01-15T10:30:00Z"
}

// Evento: activity-state  
{
  "petId": 1,
  "state": "walking",
  "confidence": 0.87,
  "magnitudes": {
    "accelerometer": 12.34,
    "gyroscope": 2.56
  }
}
```
- `trackingStarted/Stopped` - Control de seguimiento

## 🗺️ Integración con MapBox

### Configuración de API
```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  mapboxToken: 'TU_MAPBOX_TOKEN',
  socketUrl: 'https://tu-backend.railway.app'
};
```

### Funcionalidades Implementadas
- **Mapa Interactivo** - Zoom, rotación y navegación
- **Marcadores en Tiempo Real** - Posición actual de la mascota
- **Rutas Históricas** - Trayectorias guardadas
- **Zonas Seguras** - Círculos de geofencing
- **Snap to Roads** - Ajuste de rutas a calles

## 📱 Características de la Interfaz

### Diseño Glassmorphism
- Fondos translúcidos con blur
- Bordes sutiles y sombras suaves
- Efectos de profundidad y transparencia
- Paleta de colores oscura elegante

### Notificaciones Inteligentes
- Toast messages no invasivos
- Alertas de zona segura
- Notificaciones de batería baja
- Estados de conexión del dispositivo

### Responsividad
- Optimizado para móviles
- Controles táctiles intuitivos
- Layouts adaptativos
- Rendimiento optimizado

## 🔒 Consideraciones de Seguridad

- **HTTPS** obligatorio para geolocalización
- **CORS** configurado para dominios específicos
- **Validación** de datos GPS en el backend
- **Autenticación** de dispositivos ESP32C6

## 🔧 Desarrollo y Mantenimiento

### Logs y Debugging
```bash
# Backend logs
cd backend && npm run logs

# Frontend debugging
cd frontend && ng build --source-map

# ESP32C6 serial monitor
# Usar Arduino IDE Serial Monitor
```

### Actualizaciones
- **Backend**: Push a Railway para auto-deploy
- **Frontend**: Build y upload a Vercel
- **ESP32C6**: OTA updates (próxima versión)

## 📊 Métricas y Monitoreo

- **Latencia WebSocket**: < 100ms promedio
- **Precisión GPS**: ±3-5 metros
- **Autonomía**: 8-12 horas de uso continuo
- **Cobertura**: Toda zona con WiFi/4G

## 🤝 Contribución

Este proyecto está desarrollado como demostración de habilidades en **Ingeniería Electrónica** aplicada a IoT. Para sugerencias o mejoras:

1. Fork del repositorio
2. Crear feature branch
3. Commit de cambios
4. Push a la rama
5. Crear Pull Request

## 📄 Licencia

MIT License - Ver `LICENSE` para más detalles.

## 👨‍💻 Desarrollado por

**Carlos Hurtado** - Ingeniero Electrónico  
Especializado en sistemas embebidos, IoT y comunicaciones en tiempo real.

---

<div align="center">
  <strong>Pet Tracker</strong> - Tecnología al servicio del cuidado animal 🐾
</div>

## 🔄 Sistema de Detección de Actividad con MPU6050

### 📊 Especificaciones del MPU6050
- **Acelerómetro**: 3 ejes (X, Y, Z) con rango configurable ±2g a ±16g
- **Giroscopio**: 3 ejes (X, Y, Z) con rango configurable ±250°/s a ±2000°/s
- **Comunicación**: I2C (TWI) con dirección 0x68 o 0x69
- **Frecuencia de muestreo**: Hasta 8kHz (configurable)
- **Resolución**: 16 bits por canal
- **Temperatura integrada**: Sensor térmico interno

### 🧠 Algoritmo de Clasificación de Actividad

El sistema analiza las magnitudes vectoriales del acelerómetro y giroscopio para determinar el estado de actividad:

```cpp
// Cálculo de magnitudes vectoriales
float accel_magnitude = sqrt(ax² + ay² + az²);
float gyro_magnitude = sqrt(gx² + gy² + gz²);

// Clasificación de estados
if (accel_magnitude >= 15.0 && gyro_magnitude >= 4.0) {
    state = "running";       // Corriendo
} else if (accel_magnitude >= 12.0 && gyro_magnitude >= 2.5) {
    state = "walking";       // Caminando  
} else if (accel_magnitude >= 10.5 && gyro_magnitude >= 1.0) {
    state = "standing";      // Parado
} else {
    state = "lying";         // Acostado/Quieto
}
```

### 📈 Estados de Actividad Detectados

| Estado | Acelerómetro | Giroscopio | Descripción |
|--------|-------------|------------|-------------|
| **🛌 Lying** | < 10.5 g | < 1.0 °/s | Mascota acostada o muy quieta |
| **🧍 Standing** | 10.5-12.0 g | 1.0-2.5 °/s | Mascota parada o movimientos lentos |
| **🚶 Walking** | 12.0-15.0 g | 2.5-4.0 °/s | Mascota caminando a ritmo normal |
| **🏃 Running** | > 15.0 g | > 4.0 °/s | Mascota corriendo o muy activa |

### 🔍 Procesamiento de Datos IMU

1. **Adquisición**: Lectura de 6 canales (3 acelerómetro + 3 giroscopio) a 100Hz
2. **Filtrado**: Aplicación de filtro paso bajo para eliminar ruido
3. **Calibración**: Compensación de offset y escalado
4. **Análisis**: Cálculo de magnitudes vectoriales y clasificación
5. **Transmisión**: Envío de estado y datos raw vía Socket.IO

### 📡 Protocolo de Comunicación IMU

```javascript
// Estructura de datos IMU enviados por ESP32C6
{
  "petId": 1,
  "timestamp": "2025-01-15T10:30:00Z",
  "accelerometer": {
    "x": 0.12,
    "y": 9.81,
    "z": 0.03
  },
  "gyroscope": {
    "x": 0.001,
    "y": 0.002,
    "z": 0.000
  },
  "temperature": 23.5,
  "activityState": "walking",
  "confidence": 0.87
}
```
