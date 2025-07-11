# 🚀 ESP32-C6 Pet Tracker v3.0 - Guía de Configuración

## 🔧 Configuración del Arduino IDE

### 1. Configuración de la Placa
```
Placa: ESP32C6 Dev Module
Upload Speed: 115200
CPU Frequency: 160MHz
Flash Frequency: 80MHz
Flash Mode: QIO
Flash Size: 4MB (32Mb)
Partition Scheme: Huge APP (3MB No OTA/1MB SPIFFS)
Core Debug Level: None
Erase All Flash Before Sketch Upload: Enabled
```

### 2. Librerías Requeridas
En el Arduino IDE, instala estas librerías desde el Library Manager:

```
- ArduinoJson by Benoit Blanchon (versión 6.x)
- MPU6050 by Electronic Cats
- WiFi (incluida con ESP32)
- HTTPClient (incluida con ESP32)
```

## 📡 Conexiones Hardware

### GPS NEO-6M
```
NEO-6M     →  ESP32-C6
VCC        →  3.3V
GND        →  GND
TX         →  GPIO 17 (RX del ESP32)
RX         →  GPIO 16 (TX del ESP32)
```

### MPU6050 IMU
```
MPU6050    →  ESP32-C6
VCC        →  3.3V
GND        →  GND
SDA        →  GPIO 21
SCL        →  GPIO 22
```

## 🌐 Configuración de Red

### WiFi
Edita estas líneas en el código:
```cpp
const char* WIFI_SSID = "TU_WIFI_SSID";
const char* WIFI_PASSWORD = "TU_WIFI_PASSWORD";
```

### Soketi (Railway)
Las configuraciones ya están establecidas para tu aplicación:
```cpp
const char* SOKETI_HOST = "soketi-production-a060.up.railway.app";
const char* SOKETI_APP_ID = "2MkkLyzX";
const char* SOKETI_KEY = "wigli6jxrshlpmocqtm9ywevffhq21e4";
```

## 📊 Protocolo de Datos

Este código está diseñado para ser 100% compatible con tu aplicación web:

### 1. Location Update (cada 1 segundo)
```json
{
  "event": "location-update",
  "channel": "pet-tracker",
  "data": {
    "petId": "pet-001",
    "latitude": 40.416775,
    "longitude": -3.703790,
    "timestamp": 1234567890,
    "accuracy": 3.5,
    "altitude": 650.0
  }
}
```

### 2. IMU Update (cada 500ms)
```json
{
  "event": "imu-update",
  "channel": "pet-tracker",
  "data": {
    "petId": "pet-001",
    "accelX": 0.12,
    "accelY": 0.05,
    "accelZ": 9.78,
    "gyroX": 1.2,
    "gyroY": -0.8,
    "gyroZ": 0.3,
    "timestamp": 1234567890,
    "activityState": "walking"
  }
}
```

### 3. Status Update (cada 5 segundos)
```json
{
  "event": "status-update",
  "channel": "pet-tracker",
  "data": {
    "petId": "pet-001",
    "status": "online",
    "batteryLevel": 85,
    "signalStrength": 75,
    "timestamp": 1234567890
  }
}
```

## 🎯 Estados de Actividad

El sistema detecta automáticamente:
- **`lying`** - Echado/descansando (sin movimiento > 3 segundos)
- **`standing`** - Parado (movimiento mínimo)
- **`walking`** - Caminando (movimiento moderado)
- **`running`** - Corriendo (movimiento intenso)
- **`unknown`** - Estado inicial o sin datos

## ⚡ Optimizaciones

### Batería
- Throttling inteligente según la configuración de la web app
- WiFi reconexión automática
- Timeouts HTTP optimizados

### Performance
- Parser GPS NMEA optimizado
- Estructuras de datos eficientes
- Logging inteligente (cada 10 segundos)

### Memoria
- StaticJsonDocument para evitar fragmentación
- Buffers de tamaño fijo
- Limpieza automática de strings

## 🔧 Solución de Problemas

### GPS no obtiene fix
1. Verifica las conexiones en los pines 16/17
2. Asegúrate de estar en exterior con vista al cielo
3. Espera 1-2 minutos para cold start

### WiFi no conecta
1. Verifica SSID y contraseña
2. Comprueba que la red sea 2.4GHz
3. Revisa el alcance de la señal

### Datos no llegan a la web
1. Verifica que el WiFi esté conectado
2. Comprueba la consola del navegador
3. Confirma que Soketi esté funcionando

### MPU6050 no responde
1. Verifica las conexiones I2C (pines 21/22)
2. Comprueba la alimentación (3.3V)
3. Prueba con diferentes direcciones I2C

## 📈 Monitoreo

### Serial Monitor
Configura a 115200 baudios para ver:
- Estado de inicialización
- Datos GPS en tiempo real
- Actividad IMU
- Envío de datos HTTP
- Errores de conexión

### Logs Importantes
```
✅ Sistema inicializado correctamente
📍 GPS: 40.416775, -3.703790 (Sats: 8, HDOP: 1.2)
📊 IMU enviado: walking (mag: 1.45)
🔋 Estado enviado: online (87% bat, 82% señal)
❌ Error HTTP: 500
```

## 🚀 Próximos Pasos

1. **Sube el código** al ESP32-C6
2. **Conecta el hardware** según el diagrama
3. **Abre el Serial Monitor** a 115200
4. **Ejecuta tu aplicación web** (npm start)
5. **Observa los datos** llegando en tiempo real

¡Tu sistema de rastreo de mascotas está listo para funcionar! 🐕📍
