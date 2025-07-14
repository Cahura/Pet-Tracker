# Pet Tracker – Sistema de Seguimiento GPS en Tiempo Real

<div align="center">
  <img src="https://raw.githubusercontent.com/Cahura/pet-tracker/main/frontend/public/pet-icon.svg" alt="Pet Tracker Logo" width="120" height="120">
  
  ![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
  ![Socket.IO](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
  ![ESP32](https://img.shields.io/badge/ESP32-000000?style=for-the-badge&logo=espressif&logoColor=white)
  ![Railway](https://img.shields.io/badge/Railway-131415?style=for-the-badge&logo=railway&logoColor=white)
  ![Mapbox](https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white)
</div>

## 🎯 Descripción del Proyecto

**Pet Tracker** es un sistema integral de seguimiento GPS en tiempo real para mascotas, desarrollado desde la perspectiva de **Ingeniería Electrónica** con enfoque en IoT y comunicaciones. El proyecto integra hardware especializado (ESP32C6), protocolos de comunicación en tiempo real (Socket.IO) y una interfaz web moderna para crear una solución completa de monitoreo.

### 🔧 Enfoque de Ingeniería Electrónica

Este proyecto demuestra competencias técnicas en:
- **Sistemas Embebidos**: Programación de microcontroladores ESP32C6 con WiFi integrado
- **Protocolos IoT**: Implementación de comunicación WebSocket para tiempo real
- **Integración Hardware-Software**: Puente entre dispositivos físicos y aplicaciones web
- **Procesamiento de Señales GPS**: Manejo y filtrado de coordenadas geográficas
- **Arquitectura de Sistemas**: Diseño de comunicación distribuida entre múltiples componentes

### 🏗️ Arquitectura del Sistema

```
[ESP32C6 + GPS] ←--WiFi--→ [Socket.IO Server] ←--WebSocket--→ [Angular Frontend]
        │                          │                              │
   • GPS Module                • Railway Cloud               • MapBox Maps
   • WiFi Radio               • Real-time WS                • User Interface
   • Battery Monitor          • Data Processing             • Notifications
   • Status LEDs              • Device Management           • Route History
```

## 🚀 Características Técnicas

- **📡 Comunicación en Tiempo Real** - WebSocket con Socket.IO para latencia mínima
- **🛰️ Posicionamiento GPS** - Coordenadas precisas con filtrado de ruido
- **🗺️ Visualización Cartográfica** - MapBox GL JS con renderizado vectorial
- **📱 Interfaz Responsiva** - Adaptable a dispositivos móviles y desktop
- **🔋 Monitoreo Energético** - Control del estado de batería del dispositivo
- **📊 Análisis de Rutas** - Almacenamiento y procesamiento de trayectorias
- **🛡️ Geofencing** - Configuración de zonas seguras con alertas automáticas

## 🛠️ Pila Tecnológica

### Hardware
- **ESP32C6** - Microcontrolador con WiFi 6 y Bluetooth 5.0
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

### 3. Configuración del ESP32C6
```cpp
// En esp32c6/firmware.ino
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";
const char* socketURL = "https://tu-backend.railway.app";
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
- `registerDevice` - Registro inicial del dispositivo
- `gpsData` - Envío de coordenadas GPS
- `batteryLevel` - Nivel de batería actual
- `deviceStatus` - Estado del dispositivo

### Eventos del Backend → Frontend
- `deviceRegistered` - Confirmación de registro
- `locationUpdate` - Nueva ubicación GPS
- `batteryUpdate` - Actualización de batería
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
