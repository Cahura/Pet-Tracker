# Sistema de Detección de Actividad ESP32C6

## Estados de Actividad

### 1. **"resting"** - Descansando
- **Condiciones**: Acelerómetro ≤ 11.0 m/s² O Velocidad GPS < 1.0 km/h
- **Descripción**: La mascota está descansando, durmiendo o sin movimiento significativo
- **Icono**: `fa-bed` 🛏️
- **Animación**: Pulso suave y lento (3 segundos)

### 2. **"walking"** - Caminando  
- **Condiciones**: 
  - Acelerómetro > 11.0 m/s² Y Giroscopio > 1.0 rad/s
  - Velocidad GPS: 1.0 - 6.0 km/h
- **Descripción**: Movimiento moderado, caminata normal
- **Icono**: `fa-walking` 🚶
- **Animación**: Rebote vertical (1.5 segundos)

### 3. **"running"** - Corriendo
- **Condiciones**:
  - Acelerómetro > 15.0 m/s² Y Giroscopio > 2.5 rad/s  
  - Velocidad GPS: 6.0 - 15.0 km/h
- **Descripción**: Actividad física intensa, carrera
- **Icono**: `fa-running` 🏃
- **Animación**: Vibración rápida (0.8 segundos)

### 4. **"traveling"** - En transporte
- **Condiciones**: Velocidad GPS > 15.0 km/h
- **Descripción**: La mascota está en un vehículo o transporte
- **Icono**: `fa-car` 🚗
- **Animación**: Deslizamiento suave (2 segundos)

### 5. **"disconnected"** - Desconectado
- **Condiciones**: Sin datos del ESP32C6 por más de 30 segundos
- **Descripción**: ESP32C6 no está enviando datos
- **Icono**: `fa-wifi-slash` 📵
- **Animación**: Fade in/out (2 segundos)

## Configuración del ESP32C6

### Intervalos de tiempo:
- **Envío de datos**: 8 segundos (para conservar batería)
- **Actualización GPS**: 10 segundos 
- **Análisis IMU**: Continuo (promedio de 5 muestras)

### Datos enviados:
```json
{
  "petId": 1,
  "deviceId": "ESP32C6_MAX",
  "timestamp": 12345678,
  "battery": 85,
  "connectionStatus": "connected",
  "deviceActive": true,
  "latitude": -12.10426,
  "longitude": -76.96358,
  "gps_valid": true,
  "gps_speed": 2.5,
  "gps_speed_kmh": 9.0,
  "activity": "running",
  "accelerometer": {"x": 1.2, "y": -0.8, "z": 9.8},
  "gyroscope": {"x": 0.1, "y": 0.05, "z": -0.02},
  "temperature": 24.5,
  "imu_magnitude": 12.3,
  "imu_average": 11.8,
  "wifi_rssi": -45,
  "analysis_method": "imu_gps_combined"
}
```

## Algoritmo de Detección

### Prioridad de análisis:
1. **Velocidad alta** (>15 km/h) → `traveling`
2. **IMU + GPS combinado** → `running` (alta actividad + velocidad moderada)
3. **Movimiento moderado** → `walking` 
4. **Sin movimiento significativo** → `resting`

### Funciones clave:
- `analyzeAdvancedActivity()`: Análisis combinado IMU + GPS
- `analyzeGPSOnlyActivity()`: Fallback solo GPS
- `calculateDistance()`: Cálculo de distancia con fórmula haversine

## Frontend - Actualizaciones automáticas

### Componentes afectados:
- **Marcador en mapa**: Animación específica por estado
- **Popup de información**: Icono y texto descriptivo
- **Estado de mascota**: Actualización en tiempo real del servicio
- **Notificaciones**: Cambios de estado significativos

### Timeout y reconexión:
- **Timeout ESP32C6**: 30 segundos sin datos → `disconnected`
- **Verificación**: Cada 5 segundos
- **Reconexión automática**: Cuando vuelven los datos

## Personalización

### Ajustar umbrales:
```cpp
// En ESP32C6 firmware.ino
if (speedKmh > 15.0) return "traveling";     // Velocidad vehículo
if (accelMagnitude > 15.0) return "running"; // Intensidad carrera  
if (accelMagnitude > 11.0) return "walking"; // Intensidad caminata
```

### Cambiar intervalos:
```cpp
const unsigned long SEND_INTERVAL = 8000;        // Frecuencia envío
const unsigned long GPS_UPDATE_INTERVAL = 10000; // Frecuencia GPS
```

## Debugging

### Mensajes clave:
- `🔍 Análisis: Accel=12.3, Speed=8.5 km/h, Gyro=1.8`
- `🔄 Max activity state updated in service: running`
- `📤 Datos enviados: {json data}`
- `🟢 ESP32C6 started sending data - marking as connected`

### Logs en consola:
- Estado de análisis con valores IMU/GPS
- Cambios de actividad en tiempo real
- Calidad de datos GPS
- Estado de conexión ESP32C6
