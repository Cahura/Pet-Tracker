# Configuración Optimizada ESP32C6 Pet Tracker

## 🎯 Optimizaciones Realizadas

### 1. **Análisis Avanzado en el ESP32C6**
- **Procesamiento local**: Todo el análisis de actividad se hace en el ESP32C6
- **Algoritmos calibrados**: Umbrales específicos para sensor en la espalda de la mascota
- **Detección de posturas**: Analiza orientación y posición del animal
- **Confianza en la actividad**: Calcula nivel de certeza de cada detección

### 2. **Nuevas Actividades Detectadas**
- `lying` - Acostado/durmiendo
- `sitting` - Sentado
- `standing` - Parado
- `walking` - Caminando
- `running` - Corriendo
- `playing` - Jugando (movimientos erráticos)
- `traveling` - En transporte/vehículo
- `resting` - Descansando general

### 3. **Datos Procesados que Envía el ESP32C6**
```json
{
  "petId": 1,
  "deviceId": "ESP32C6_MAX",
  "activity": "walking",
  "activity_confidence": 0.85,
  "movement_intensity": 65,
  "posture": "upright",
  "gps_valid": true,
  "latitude": -12.12345,
  "longitude": -76.98765,
  "gps_speed_kmh": 4.2,
  "accelerometer": {"x": 1.2, "y": 0.8, "z": 9.8},
  "gyroscope": {"x": 0.1, "y": 0.2, "z": 0.05},
  "temperature": 24.5,
  "battery": 85
}
```

## 🔧 Configuración Necesaria

### **PASO 1: Credenciales WiFi**
Edita estas líneas en `firmware.ino`:
```cpp
const char* ssid = "TU_WIFI_SSID";           // ← Cambiar por tu WiFi
const char* password = "TU_WIFI_PASSWORD";    // ← Cambiar por tu contraseña
```

### **PASO 2: Conexiones Físicas**
```
ESP32C6 ←→ MPU6050 (IMU)
- GPIO 6  ←→ SDA
- GPIO 7  ←→ SCL
- 3.3V    ←→ VCC
- GND     ←→ GND

ESP32C6 ←→ Módulo GPS
- UART1 RX (por defecto) ←→ TX del GPS
- UART1 TX (por defecto) ←→ RX del GPS
- 3.3V    ←→ VCC
- GND     ←→ GND
```

### **PASO 3: Posicionamiento del Sensor**
- Montar el ESP32C6 + sensores en la **espalda** de la mascota
- Orientación: Eje Z apuntando hacia arriba (perpendicular al suelo)
- Asegurar que esté bien fijado para mediciones precisas

## 📊 Mejoras del Sistema

### **Backend Optimizado**
- Solo retransmite datos ya procesados del ESP32C6
- No hace cálculos adicionales (optimización de recursos)
- Validación de datos mejorada

### **Frontend Mejorado**
- Muestra datos procesados directamente del ESP32C6
- Popup con información detallada:
  - Confianza de la actividad (%)
  - Intensidad de movimiento (%)
  - Postura detectada
  - Velocidad GPS (km/h)
- Actualizaciones en tiempo real

### **Algoritmos de Detección Calibrados**
Los umbrales están optimizados para un sensor **en la espalda**:

```cpp
// Umbrales calibrados para sensor en la espalda
struct ActivityThresholds {
  float lying_accel = 9.2;      // Acostado
  float lying_gyro = 0.5;
  float sitting_accel = 10.5;   // Sentado
  float sitting_gyro = 1.2;
  float standing_accel = 11.8;  // Parado
  float standing_gyro = 2.0;
  float walking_accel = 13.5;   // Caminando
  float walking_gyro = 3.5;
  float running_accel = 16.0;   // Corriendo
  float running_gyro = 5.5;
  float playing_accel = 18.0;   // Jugando
  float playing_gyro = 7.0;
};
```

## 🚀 Cómo Usar

1. **Subir código al ESP32C6**: Configura WiFi y sube `firmware.ino`
2. **Ejecutar backend**: `cd backend && npm start`
3. **Abrir página web**: `http://localhost:3000`
4. **Monitorear en tiempo real**: Los datos aparecerán automáticamente

## 🔍 Debugging

### Monitor Serie del ESP32C6
```
=== INICIANDO ESP32C6 PET TRACKER OPTIMIZADO ===
✅ WiFi conectado!
📍 IP: 192.168.1.100
✅ WebSocket conectado!
🎯 Actividad: walking | Accel: 13.2 | Gyro: 3.1 | Speed: 4.2 m/s
📤 Datos enviados: {"petId":1,"activity":"walking"...}
```

### Logs del Backend
```
🟢 Cliente WebSocket conectado desde 192.168.1.100
📊 Actividad del ESP32C6: walking (confianza: 85%)
📍 GPS válido para Max: -12.12345, -76.98765
📤 Datos de ESP32C6_MAX enviados a 1 clientes
```

## ✅ Beneficios de la Optimización

1. **Procesamiento local**: Reduce latencia y carga del servidor
2. **Mayor precisión**: Algoritmos calibrados para la posición específica
3. **Datos ricos**: Más información útil (confianza, intensidad, postura)
4. **Eficiencia**: Backend solo retransmite, no procesa
5. **Tiempo real**: Actualizaciones cada 8 segundos
6. **Escalabilidad**: Sistema preparado para múltiples dispositivos

Tu ESP32C6 ahora es un sistema de análisis completo que envía datos ya procesados y listos para mostrar en la página web. ¡Solo falta configurar las credenciales WiFi y probarlo!
