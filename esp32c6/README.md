# ESP32C6 Pet Tracker Firmware

## Descripción
Firmware para ESP32C6 que implementa un rastreador GPS para mascotas con comunicación en tiempo real vía Socket.IO.

## Características
- 📡 Conexión WiFi automática
- 🔗 Cliente Socket.IO para comunicación en tiempo real
- 📍 Simulación GPS (preparado para módulo GPS real)
- 🔋 Monitoreo de batería
- 🛡️ Soporte para zonas seguras
- ⚡ Tracking configurable (intervalo y distancia mínima)

## Requisitos de Hardware
- ESP32C6 DevKit
- Módulo GPS (opcional, usa simulación por defecto)
- Batería LiPo (recomendado)
- Antena WiFi (integrada)

## Librerías Requeridas
Instalar desde el Library Manager de Arduino IDE:

```
SocketIOclient by Markus Sattler
ArduinoJson by Benoit Blanchon
```

## Configuración

### 1. Configuración Wi-Fi
Editar en `firmware.ino`:
```cpp
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";
```

### 2. Configuración Socket.IO
Editar en `firmware.ino`:
```cpp
const char* socketIOHost = "TU_BACKEND.up.railway.app";
const int socketIOPort = 443; // 443 para HTTPS, 80 para HTTP local
```

### 3. Configuración de Mascota
Editar en `firmware.ino`:
```cpp
const String DEVICE_ID = "ESP32C6_001";
const int PET_ID = 1; // 1=Max, 2=Luna, 3=Charlie, 4=Bella
```

## Instalación

### 1. Configurar Arduino IDE
1. Instalar soporte para ESP32 en Arduino IDE
2. Seleccionar placa: `ESP32C6 Dev Module`
3. Configurar:
   - CPU Frequency: 160MHz
   - Flash Size: 4MB
   - Partition Scheme: Default

### 2. Instalar librerías
```
Tools → Library Manager → Buscar e instalar:
- SocketIOclient
- ArduinoJson
```

### 3. Cargar firmware
1. Conectar ESP32C6 via USB
2. Seleccionar puerto correcto en `Tools → Port`
3. Compilar y cargar: `Sketch → Upload`

## Uso

### 1. Monitor Serie
Abrir Serial Monitor (115200 baud) para ver logs:
```
🚀 Iniciando Pet Tracker ESP32C6...
🔌 Conectando a WiFi...
✅ WiFi conectado. IP: 192.168.1.100
🔗 Conectando a Socket.IO...
🟢 Conectado a Socket.IO
✅ Sistema listo. Esperando comandos...
```

### 2. Comandos desde Frontend
El ESP32C6 responde a estos eventos Socket.IO:

- `startTracking`: Inicia el envío de coordenadas GPS
- `stopTracking`: Detiene el tracking
- `configureSafeZone`: Configura zona segura

### 3. Datos enviados
El dispositivo envía estos eventos:

- `esp32-connect`: Registro del dispositivo
- `gps-data`: Coordenadas GPS y datos del sensor
- `battery-alert`: Alerta de batería baja
- `safe-zone-alert`: Alerta de zona segura

## Estructura del Código

### Funciones Principales
- `setup()`: Inicialización WiFi y Socket.IO
- `loop()`: Bucle principal de tracking
- `socketIOEvent()`: Manejo de eventos Socket.IO
- `sendGPSData()`: Envío de datos GPS
- `simulateGPSMovement()`: Simulación de movimiento

### Variables Importantes
- `isTracking`: Estado del tracking
- `trackingInterval`: Intervalo de envío (ms)
- `minDistance`: Distancia mínima para enviar (m)
- `batteryLevel`: Nivel de batería (0-100%)

## Integración con GPS Real

Para usar un módulo GPS real, reemplazar `simulateGPSMovement()`:

```cpp
#include <SoftwareSerial.h>
#include <TinyGPS++.h>

TinyGPSPlus gps;
SoftwareSerial ss(4, 5);

void setup() {
  // ... código existente ...
  ss.begin(9600);
}

void readGPSData() {
  while (ss.available() > 0) {
    if (gps.encode(ss.read())) {
      if (gps.location.isValid()) {
        currentLat = gps.location.lat();
        currentLng = gps.location.lng();
        gpsAccuracy = gps.hdop.hdop();
        currentSpeed = gps.speed.kmph();
      }
    }
  }
}
```

## Troubleshooting

### Problemas de Conexión WiFi
- Verificar SSID y password
- Asegurar señal WiFi fuerte
- Revisar configuración de red

### Problemas de Socket.IO
- Verificar URL del servidor
- Comprobar que el backend esté ejecutándose
- Revisar logs del servidor

### Problemas de Compilación
- Verificar librerías instaladas
- Actualizar ESP32 board package
- Limpiar cache: `Tools → ESP32 Sketch Data Upload`

## Logs y Debugging

### Niveles de Log
```
🚀 Inicio del sistema
🔌 Conexión WiFi
🟢 Conexión Socket.IO exitosa
🔴 Desconexión Socket.IO
📨 Evento recibido
▶️ Tracking iniciado
⏹️ Tracking detenido
📍 Datos GPS enviados
🔋 Alerta de batería
🛡️ Configuración zona segura
❌ Errores
```

### Debugging Avanzado
Habilitar debug detallado en `firmware.ino`:
```cpp
#define DEBUG_SOCKETIO
#define DEBUG_GPS
```

## Optimizaciones de Batería

### Configuración de Bajo Consumo
```cpp
// Aumentar intervalo de tracking
trackingInterval = 30000; // 30 segundos

// Aumentar distancia mínima
minDistance = 50.0; // 50 metros

// Usar deep sleep entre envíos
esp_sleep_enable_timer_wakeup(trackingInterval * 1000);
esp_deep_sleep_start();
```

### Monitoreo de Batería
El sistema monitorea automáticamente:
- Nivel de batería cada minuto
- Alerta cuando < 20%
- Tracking se detiene automáticamente < 5%

## Especificaciones Técnicas

### Rendimiento
- Consumo promedio: 80-120mA
- Duración batería: 8-12 horas (batería 2000mAh)
- Precisión GPS: 3-5 metros (con módulo GPS)
- Intervalo mínimo: 1 segundo
- Alcance WiFi: 50-100 metros

### Protocolos Soportados
- WiFi 802.11 b/g/n
- Socket.IO v4
- JSON para intercambio de datos
- HTTPS/WSS para producción

## Licencia
MIT License - Ver archivo LICENSE para detalles.
