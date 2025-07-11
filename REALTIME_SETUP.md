# Pet Tracker - Comunicación en Tiempo Real ESP32C6 ↔ Web

Este proyecto implementa un sistema completo de rastreo de mascotas usando ESP32C6 con GPS y IMU, comunicándose en tiempo real con una aplicación web mediante Soketi (Pusher compatible).

## 🚀 Características

- **Ubicación GPS en tiempo real** usando módulo NEO-6M
- **Análisis de actividad** con IMU MPU6050 (detecta si está echado, parado, caminando, corriendo)
- **Comunicación WebSocket** mediante Soketi en Railway
- **Visualización en mapa** con Mapbox en tiempo real
- **Panel de monitoreo** con datos de ubicación, actividad y estado del dispositivo

## 📋 Componentes Necesarios

### Hardware ESP32C6:
- ESP32C6 DevKit
- Módulo GPS NEO-6M
- IMU MPU6050 (acelerómetro + giroscopio 6 ejes)
- Cables jumper
- Breadboard (opcional)

### Software:
- Arduino IDE con soporte ESP32C6
- Librerías: WiFi, HTTPClient, ArduinoJson, SoftwareSerial, Wire, MPU6050

## 🔧 Conexiones ESP32C6

### GPS NEO-6M:
```
NEO-6M    ESP32C6
VCC   →   3.3V
GND   →   GND
TX    →   Pin 4 (RX)
RX    →   Pin 5 (TX)
```

### MPU6050:
```
MPU6050   ESP32C6
VCC   →   3.3V
GND   →   GND
SDA   →   Pin 21 (SDA)
SCL   →   Pin 22 (SCL)
```

## ⚙️ Configuración

### 1. Configurar ESP32C6:

1. **Instalar librerías en Arduino IDE:**
   ```
   - ArduinoJson (by Benoit Blanchon)
   - MPU6050 (by Electronic Cats)
   ```

2. **Editar configuración WiFi en el código:**
   ```cpp
   const char* ssid = "TU_WIFI_SSID";
   const char* password = "TU_WIFI_PASSWORD";
   ```

3. **Subir el código** `esp32c6_pet_tracker.ino` al ESP32C6

### 2. Configurar la aplicación web:

1. **Instalar dependencias:**
   ```bash
   cd pet-tracker
   npm install
   ```

2. **Las configuraciones de Soketi ya están incluidas** en los archivos environment

3. **Ejecutar la aplicación:**
   ```bash
   npm start
   ```

## 📡 Protocolo de Comunicación

### Eventos que envía el ESP32C6:

#### 1. `location-update` (cada 5 segundos)
```json
{
  "event": "location-update",
  "channel": "pet-tracker",
  "data": {
    "petId": "pet-001",
    "latitude": 40.416775,
    "longitude": -3.703790,
    "timestamp": 1641234567890,
    "accuracy": 3.5,
    "speed": 2.1,
    "altitude": 650.0
  }
}
```

#### 2. `imu-update` (cada 2 segundos)
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
    "timestamp": 1641234567890,
    "activityState": "lying" // lying, standing, walking, running
  }
}
```

#### 3. `status-update` (cada 30 segundos)
```json
{
  "event": "status-update",
  "channel": "pet-tracker",
  "data": {
    "petId": "pet-001",
    "status": "online",
    "batteryLevel": 85,
    "signalStrength": 75,
    "timestamp": 1641234567890
  }
}
```

## 🎯 Estados de Actividad

El sistema detecta automáticamente los siguientes estados:

- **`lying`** - Echado/Descansando (sin movimiento por >2 segundos)
- **`standing`** - Parado (movimiento mínimo)
- **`walking`** - Caminando (movimiento moderado)
- **`running`** - Corriendo (movimiento intenso)

### Personalización del Análisis de Actividad

En el código ESP32C6, busca el comentario `/* ESPACIO PARA TU CÓDIGO PERSONALIZADO */` para implementar algoritmos más avanzados de detección de actividad.

## 🌐 Funcionalidades Web

### Panel en Tiempo Real:
- **Estado de conexión** - Indica si está recibiendo datos
- **Ubicación GPS** - Coordenadas, precisión y timestamp
- **Estado de actividad** - Con iconos y colores distintivos
- **Estado del dispositivo** - Batería, señal, conexión

### Mapa Interactivo:
- **Marcador animado** - Cambia según el estado de actividad
- **Actualización en tiempo real** - El marcador se mueve automáticamente
- **Animaciones** - Diferentes efectos visuales por cada estado
- **Zoom automático** - Sigue a la mascota en el mapa

## 🧪 Modo de Prueba

Para probar sin hardware real:

1. **En la aplicación web**, haz clic en "Simular Datos" en el panel
2. **En el ESP32C6**, descomenta las líneas de datos simulados en el código

## 🔍 Solución de Problemas

### ESP32C6:
- **GPS no obtiene fix**: Asegúrate de estar en exterior con vista al cielo
- **WiFi no conecta**: Verifica SSID y contraseña
- **MPU6050 no responde**: Revisa las conexiones I2C

### Aplicación Web:
- **No recibe datos**: Verifica la configuración de Soketi en Railway
- **Marcador no aparece**: Revisa la consola del navegador para errores

## 📊 Configuración de Railway/Soketi

Las variables ya están configuradas en el proyecto:

```
SOKETI_PUBLIC_HOST: soketi-production-a060.up.railway.app
SOKETI_PUBLIC_PORT: 443
APP_ID: 2MkkLyzX
APP_KEY: wigli6jxrshlpmocqtm9ywevffhq21e4
APP_SECRET: 0s5eqev9spsgpd3zgzjrpw6rs08rrwv1
```

## 🚀 Próximos Pasos

1. **Añadir múltiples mascotas** - Modificar petId para diferentes dispositivos
2. **Historial de rutas** - Guardar y mostrar trayectorias
3. **Alertas geofencing** - Notificaciones cuando sale de zona segura
4. **Machine Learning** - Mejor clasificación de actividades
5. **Aplicación móvil** - Versión nativa para iOS/Android

## 📝 Notas Importantes

- **Consumo de batería**: El envío frecuente de datos consume batería
- **Cobertura GPS**: Funciona mejor en exteriores
- **Precisión IMU**: Calibra el MPU6050 según la orientación del collar
- **Red móvil**: Para uso real, considera un módulo GSM/LTE

¡Tu sistema de rastreo de mascotas está listo! 🐕📍
