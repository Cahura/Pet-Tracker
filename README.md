# Pet Tracker – Seguimiento GPS en tiempo real

<div align="center">
  <img src="https://raw.githubusercontent.com/Cahura/pet-tracker/main/frontend/public/pet-icon.svg" alt="Pet Tracker Logo" width="120" height="120">
  
  ![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
  ![Socket.IO](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
  ![ESP32](https://img.shields.io/badge/ESP32-000000?style=for-the-badge&logo=espressif&logoColor=white)
  ![Railway](https://img.shields.io/badge/Railway-131415?style=for-the-badge&logo=railway&logoColor=white)
  ![Mapbox](https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white)
</div>

## 🎯 Descripción del Proyecto

Pet Tracker es una aplicación web completa de seguimiento GPS en tiempo real para mascotas, desarrollada con tecnologías modernas y arquitectura escalable. El sistema permite monitorear la ubicación de mascotas a través de dispositivos ESP32C6 que se comunican con una aplicación web Angular mediante Socket.IO.

### �️ Arquitectura del Sistema

```
ESP32C6 Device  ←→  Socket.IO Backend (Railway)  ←→  Angular Frontend (Vercel)
     │                        │                           │
  GPS Module              Real-time WS                MapBox Maps
  WiFi Module            Data Processing             Notifications
  Battery Monitor        Device Management           History Tracking
```

## 🚀 Características Principales

- **📍 Seguimiento GPS en tiempo real** - Ubicación precisa con updates cada 5 segundos
- **🗺️ Mapas interactivos** - Visualización con MapBox GL JS y rutas realistas
- **🔔 Notificaciones inteligentes** - Alertas de zona segura con diseño glassmorphism
- **📱 Interfaz responsiva** - Optimizada para dispositivos móviles y desktop
- **🔋 Monitoreo de batería** - Control del estado de los dispositivos ESP32C6
- **📊 Historial de rutas** - Almacenamiento y visualización de trayectorias
- **🛡️ Zonas seguras** - Configuración de áreas permitidas con alertas automáticas

## �️ Pila Tecnológica

### Frontend
- **Angular 18** - Framework principal
- **TypeScript** - Lenguaje de programación
- **Socket.IO Client** - Comunicación en tiempo real
- **MapBox GL JS** - Renderizado de mapas
- **SCSS** - Estilos avanzados con glassmorphism

### Backend
- **Node.js** - Servidor principal
- **Express.js** - Framework web
- **Socket.IO** - WebSocket en tiempo real
- **Railway** - Plataforma de despliegue

### Hardware
- **ESP32C6** - Microcontrolador principal
- **GPS Module** - Módulo de posicionamiento
- **WiFi** - Conectividad inalámbrica

## 📋 Requisitos Previos

- **Node.js** ≥ v20.19.0
- **npm** ≥ 10.0.0
- **Angular CLI** ≥ 18.0.0
- **Git** para control de versiones
- **Arduino IDE** o **PlatformIO** para ESP32C6

## 🔧 Instalación Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/Cahura/pet-tracker.git
cd pet-tracker
```

### 2. Configurar Backend
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus configuraciones
npm run dev
```

### 3. Configurar Frontend
```bash
cd frontend
npm install
ng serve
```

### 4. Configurar ESP32C6
```bash
cd esp32c6
# Abrir firmware.ino en Arduino IDE
# Configurar WiFi y URL del servidor
# Subir a ESP32C6
```

## 🚀 Despliegue en Producción

### 1. Backend en Railway
```bash
cd backend
npm install
git push railway main
```

### 2. Frontend en Vercel
```bash
cd frontend
npm install
ng build --configuration production
# Desplegar en Vercel
```

### 3. Configurar ESP32C6
```cpp
// En firmware.ino
const char* socketIOHost = "tu-backend.up.railway.app";
```
- Pulso de ubicación con transparencias suaves
- Auto-fade después de 8 segundos

### 🛡️ **Advanced Safe Zones**
- Modal interface con liquid glass design
- Editor de zonas con preview en tiempo real
- Controles de radio ajustables (50m - 500m)
- Tipos de zona con emojis (🏠🌳💼📍)
- Toggles para notificaciones activas

### 🔔 **Smart Notifications**
- Sistema filtrado para producción (solo alertas críticas)
- Animaciones de entrada escalonadas
- Liquid glass design con backdrop blur
- Progress bars y auto-dismiss inteligente
- Posicionamiento responsive

### 🎨 **Visual Polish**
- Eliminación de indicadores de estado redundantes
- Popups informativos con hover interactions
- Optimizaciones de performance con hardware acceleration
- Throttling de updates en tiempo real (1s location, 500ms IMU, 5s status)

## 🛠️ Instalación y Configuración

### Prerrequisitos

- Node.js (versión 18 o superior)
- Angular CLI (`npm install -g @angular/cli`)
- Cuenta de Mapbox (para el token de API)
- Arduino IDE con soporte ESP32-C6

### Instalación del Frontend

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Cahura/pet-tracker.git
   cd pet-tracker
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura tu token de Mapbox:
   - Edita `src/app/utils/mapbox-config.ts`
   - Reemplaza el token existente con el tuyo

4. Ejecuta la aplicación:
   ```bash
   ng serve
   ```

5. Abre tu navegador en `http://localhost:4200`

### Configuración del ESP32-C6

#### Configuración Arduino IDE CRÍTICA:
```
Board: "ESP32C6 Dev Module"
Upload Speed: "115200"
Flash Mode: "QIO"
Flash Size: "4MB (32Mb)"
Partition Scheme: "Huge APP (3MB No OTA/1MB SPIFFS)"
Erase All Flash Before Sketch Upload: "Enabled"
USB CDC On Boot: "Enabled"
```

#### Procedimiento de Upload:
1. **Desconectar** ESP32-C6 del USB
2. **Mantener presionado** el botón BOOT
3. **Conectar** USB (mantener BOOT presionado)
4. **Upload** inmediatamente en Arduino IDE
5. **Soltar BOOT** cuando aparezca "Connecting..."
6. **Esperar** (puede tomar 3-5 minutos)

#### Librerías necesarias:
- WiFi (incluida en ESP32)
- HTTPClient (incluida en ESP32)
- ArduinoJson (instalar desde Library Manager)
- Wire (incluida)
- MPU6050 (instalar "MPU6050" by Electronic Cats)

## 📱 Integración con ESP32-C6

### Hardware Necesario

- ESP32-C6 DevKit
- Módulo GPS NEO-6M
- Batería LiPo 3.7V
- Carcasa resistente al agua (opcional)

### Conexiones

| ESP32-C6 | NEO-6M |
|----------|---------|
| VCC      | VCC     |
| GND      | GND     |
| GPIO4    | TX      |
| GPIO5    | RX      |

### Código del ESP32 (Ultra-Optimizado)

El código completo está en `ESP32_PetTracker.ino`. Características principales:

```cpp
// Configuración optimizada para ESP32-C6
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <Wire.h>
#include <MPU6050.h>

// Hardware Serial para GPS (más estable que SoftwareSerial)
HardwareSerial gpsSerial(1); // UART1

void setup() {
  Serial.begin(115200);
  
  // GPS en pines correctos para ESP32-C6
  gpsSerial.begin(9600, SERIAL_8N1, 4, 5); // RX=4, TX=5
  
  // Inicializar MPU6050
  Wire.begin();
  mpu.initialize();
  mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_4);
  
  // Conectar WiFi
  WiFi.begin(ssid, password);
  
  Serial.println("ESP32C6 Pet Tracker Ready");
}

// Funciones principales:
// - readGPS(): Parser NMEA optimizado
// - readIMU(): Lectura de acelerómetro
// - updateActivity(): Análisis de actividad (running/walking/lying)
// - sendLocation(): Envío de coordenadas GPS
// - sendIMU(): Envío de datos de movimiento
// - sendStatus(): Envío de estado de batería y señal
```

**Optimizaciones del código:**
- ✅ **Ultra-compacto**: Solo 6KB vs 15KB de versiones anteriores
- ✅ **HardwareSerial**: Más estable que SoftwareSerial para GPS
- ✅ **StaticJsonDocument**: Uso eficiente de memoria
- ✅ **Pines correctos**: GPIO4/5 para ESP32-C6
- ✅ **Compatible 100%**: Funciona perfecto con el frontend Angular

## 🌐 Configuración del Servidor

### Opción 1: WebSocket Server (Recomendado)

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
  console.log('ESP32 conectado');
  
  ws.on('message', function incoming(data) {
    const locationData = JSON.parse(data);
    
    // Broadcast a todos los clientes conectados
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(locationData));
      }
    });
  });
});
```

### Opción 2: API REST

```javascript
const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

let currentLocation = {};

app.post('/api/location', (req, res) => {
  currentLocation = req.body;
  res.json({ success: true });
});

app.get('/api/location', (req, res) => {
  res.json(currentLocation);
});

app.listen(3000, () => {
  console.log('Servidor corriendo en puerto 3000');
});
```

## 🔧 Personalización

### Cambiar el Estilo del Mapa

Edita `src/app/map/map.ts` línea 48:

```typescript
style: 'mapbox://styles/mapbox/satellite-v9', // Vista satelital
// o
style: 'mapbox://styles/mapbox/dark-v10',     // Tema oscuro
```

### Configurar Geofencing

```typescript
// En el servicio PetLocationService
enableGeofencing([longitude, latitude], radius_in_meters);
```

### Personalizar Intervalos

```typescript
// Cambiar frecuencia de actualización
setUpdateInterval(10000); // 10 segundos
```

## 🎨 Personalización de Interfaz

### Colores del Tema

Edita `src/app/app.scss`:

```scss
:root {
  --primary-color: #tu-color-principal;
  --secondary-color: #tu-color-secundario;
  --accent-color: #tu-color-acento;
}
```

### Iconos y Avatares

Cambia los iconos en `src/app/app.html`:

```html
<i class="fas fa-cat"></i> <!-- Para gatos -->
<i class="fas fa-dog"></i> <!-- Para perros -->
```

## 📱 Instalación como PWA

La aplicación puede instalarse como una Progressive Web App:

1. Agregar el Service Worker
2. Configurar el manifest.json
3. Habilitar instalación offline

## 🔒 Seguridad

- Usa HTTPS en producción
- Implementa autenticación de usuarios
- Encripta las comunicaciones WebSocket
- Valida todos los datos del ESP32

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

---

¡Hecho con ❤️ para mantener seguras a nuestras mascotas! 🐾
