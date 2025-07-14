# Configuración del Proyecto ESP32C6 con MPU6050

## Descripción del Proyecto
Este proyecto implementa un sistema completo de rastreo de mascotas usando:
- **ESP32C6**: Microcontrolador principal con WiFi
- **MPU6050**: Sensor IMU de 6 ejes (acelerómetro + giroscopio) 
- **Análisis de Actividad**: Detección inteligente de estados (lying/standing/walking/running)
- **Comunicación en Tiempo Real**: Socket.IO WebSocket con backend Node.js

## Hardware Requerido

### Componentes Principales
- ESP32C6 Development Board
- MPU6050 IMU Sensor (6-axis: 3-axis gyroscope + 3-axis accelerometer)
- Cables Dupont (macho-hembra)
- Breadboard (opcional)
- Resistencias pull-up 4.7kΩ (si no están integradas en el módulo MPU6050)

### Conexiones ESP32C6 ↔ MPU6050

| ESP32C6 Pin | MPU6050 Pin | Descripción |
|-------------|-------------|-------------|
| 3.3V        | VCC         | Alimentación 3.3V |
| GND         | GND         | Tierra común |
| GPIO21      | SDA         | Línea de datos I2C |
| GPIO22      | SCL         | Línea de reloj I2C |
| -           | XDA         | Sin conectar |
| -           | XCL         | Sin conectar |
| -           | AD0         | GND (dirección I2C: 0x68) |
| -           | INT         | Sin conectar (opcional para interrupciones) |

## Software y Bibliotecas

### Bibliotecas Requeridas para Arduino IDE

1. **WiFi Library** (incluida en ESP32 Core)
2. **ArduinoWebsockets** by Markus Sattler
   ```
   Sketch -> Include Library -> Manage Libraries
   Buscar: "ArduinoWebsockets" 
   Instalar la versión más reciente
   ```

3. **ArduinoJson** by Benoit Blanchon
   ```
   Sketch -> Include Library -> Manage Libraries
   Buscar: "ArduinoJson"
   Instalar versión 6.x (compatible)
   ```

4. **MPU6050 Library** by Electronic Cats
   ```
   Sketch -> Include Library -> Manage Libraries
   Buscar: "MPU6050"
   Instalar: "MPU6050 by Electronic Cats" o "MPU6050 by Jeff Rowberg"
   ```

5. **Wire Library** (incluida en Arduino Core)

### Configuración ESP32C6 en Arduino IDE

1. **Instalar ESP32 Board Package:**
   - File → Preferences
   - Additional Board Manager URLs: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Tools → Board → Boards Manager
   - Buscar "esp32" e instalar "esp32 by Espressif Systems"

2. **Seleccionar Board:**
   - Tools → Board → ESP32 Arduino → ESP32C6 Dev Module

3. **Configurar Parámetros:**
   - CPU Frequency: 160MHz
   - Flash Size: 4MB
   - Partition Scheme: Default 4MB with spiffs
   - Upload Speed: 921600

## Configuración del Código

### Variables a Modificar en `firmware_mpu6050.ino`

```cpp
// Configuración WiFi (OBLIGATORIO CAMBIAR)
const char* ssid = "TU_WIFI_SSID";           // Nombre de tu red WiFi
const char* password = "TU_WIFI_PASSWORD";    // Contraseña de tu WiFi

// Configuración del servidor (OBLIGATORIO CAMBIAR)
const char* websockets_server = "192.168.1.100";  // IP de tu servidor Node.js
const int websockets_port = 3000;                  // Puerto del servidor
```

### Configuración I2C (Pines Personalizables)

```cpp
// Pines I2C (modificar si usas otros pines)
Wire.begin(21, 22);  // SDA=GPIO21, SCL=GPIO22
```

## Funcionalidades Implementadas

### 1. Lectura del Sensor MPU6050
- **Acelerómetro**: Detecta aceleración en 3 ejes (X, Y, Z)
- **Giroscopio**: Detecta velocidad angular en 3 ejes (X, Y, Z)  
- **Temperatura**: Sensor interno del MPU6050
- **Frecuencia**: 10Hz (cada 100ms) con promediado de 10 muestras

### 2. Análisis Inteligente de Actividad

#### Algoritmo de Clasificación
El sistema analiza las magnitudes vectoriales del acelerómetro y giroscopio:

```cpp
// Cálculo de magnitudes
float accelMagnitude = √(ax² + ay² + az²)
float gyroMagnitude = √(gx² + gy² + gz²)
```

#### Umbrales de Detección (Calibrables)
- **Lying (Descansando)**: accel < 9.5g, gyro < 0.5°/s
- **Standing (De pie)**: accel < 10.5g, gyro < 1.5°/s  
- **Walking (Caminando)**: accel < 12.0g, gyro < 3.0°/s
- **Running (Corriendo)**: accel ≥ 15.0g, gyro ≥ 5.0°/s

#### Nivel de Confianza
Cada detección incluye un porcentaje de confianza basado en:
- Proximidad a los umbrales definidos
- Estabilidad de las lecturas
- Rango: 70% - 95%

### 3. Transmisión de Datos

#### Eventos Socket.IO Enviados

1. **imu-data**: Datos brutos del sensor (cada 3 segundos)
   ```json
   {
     "petId": 1,
     "deviceId": "ESP32C6_MAX",
     "accelerometer": {"x": 0.12, "y": -0.05, "z": 9.78},
     "gyroscope": {"x": 1.2, "y": -0.8, "z": 0.3},
     "temperature": 26.5,
     "timestamp": 1672531200000
   }
   ```

2. **activity-state**: Estado de actividad procesado
   ```json
   {
     "petId": 1,
     "deviceId": "ESP32C6_MAX", 
     "state": "walking",
     "confidence": 0.85,
     "magnitudes": {
       "accelerometer": 11.2,
       "gyroscope": 2.1
     },
     "timestamp": 1672531200000
   }
   ```

3. **location-data**: Datos GPS simulados
   ```json
   {
     "petId": 1,
     "latitude": -12.0464,
     "longitude": -77.0428,
     "accuracy": 3.2,
     "timestamp": 1672531200000
   }
   ```

4. **battery-data**: Estado de la batería
   ```json
   {
     "petId": 1,
     "voltage": 3.85,
     "percentage": 78,
     "charging": false,
     "timestamp": 1672531200000
   }
   ```

## Calibración del Sensor

### Proceso de Calibración Inicial

1. **Colocar el dispositivo en reposo** (sobre superficie plana)
2. **Ejecutar el firmware** - automáticamente calibra durante 3 segundos
3. **Observar lecturas** en Serial Monitor (115200 baudios)
4. **Ajustar umbrales** si es necesario según el comportamiento de la mascota

### Ajuste de Umbrales Personalizado

Para perros más grandes o más activos, modificar en `analyzeActivity()`:

```cpp
// Umbrales para perros grandes/activos
const float LYING_ACCEL_THRESHOLD = 10.0;
const float WALKING_ACCEL_THRESHOLD = 14.0; 
const float RUNNING_ACCEL_THRESHOLD = 18.0;
```

Para gatos o perros pequeños:

```cpp
// Umbrales para gatos/perros pequeños  
const float LYING_ACCEL_THRESHOLD = 9.0;
const float WALKING_ACCEL_THRESHOLD = 10.5;
const float RUNNING_ACCEL_THRESHOLD = 13.0;
```

## Troubleshooting

### Problemas Comunes

1. **MPU6050 no detectado**
   ```
   ❌ MPU6050 no encontrado
   ```
   - Verificar conexiones SDA/SCL
   - Comprobar alimentación 3.3V
   - Verificar resistencias pull-up (4.7kΩ)

2. **Lecturas erróneas del sensor**
   - Recalibrar el sensor (mantener inmóvil durante inicialización)
   - Verificar que no haya interferencias magnéticas
   - Ajustar umbrales de detección

3. **Conexión WiFi falla**
   ```
   📡 Conectando a WiFi: TU_WIFI_SSID
   ....
   ```
   - Verificar SSID y contraseña
   - Comprobar señal WiFi en la ubicación
   - Usar WiFi de 2.4GHz (no 5GHz)

4. **WebSocket no conecta**
   ```
   ❌ Error al conectar WebSocket
   ```
   - Verificar IP del servidor backend
   - Comprobar que el servidor Node.js esté ejecutándose
   - Verificar firewall/puerto 3000

### Debug y Monitoreo

#### Serial Monitor Output Esperado:
```
🚀 Iniciando ESP32C6 Pet Tracker con MPU6050...
🔧 Inicializando MPU6050...
✅ MPU6050 inicializado correctamente
🎯 Calibrando MPU6050 (mantener inmóvil 3 segundos)...
📡 Conectando a WiFi: MiWiFi
✅ WiFi conectado!
📍 IP address: 192.168.1.150
🔌 Configurando WebSocket...
✅ Conectado al servidor WebSocket
✅ Sistema iniciado correctamente
📡 Enviando datos de Max (Pet ID: 1)

📊 IMU - Accel: (0.12, -0.05, 9.78)g, Gyro: (1.2, -0.8, 0.3)°/s, Temp: 26.5°C
🐕 Actividad detectada: standing (confianza: 82.3%, accel: 9.80, gyro: 1.52)
📍 GPS enviado: -12.046400, -77.042800
🔋 Batería: 78%
```

## Próximas Mejoras

### Funcionalidades Futuras
- GPS real (módulo NEO-8M)
- Sensor de frecuencia cardíaca
- Detección de caídas/emergencias
- Modo de bajo consumo (deep sleep)
- Comunicación LoRaWAN para largas distancias
- Almacenamiento local en SD card

### Optimizaciones de Software
- Filtro Kalman para mejor precisión del IMU
- Machine Learning on-device para mejor clasificación
- Adaptive thresholding basado en patrones históricos
- Compresión de datos para transmisión eficiente

## Recursos Adicionales

### Documentación Técnica
- [ESP32C6 Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-c6_datasheet_en.pdf)
- [MPU6050 Datasheet](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf)
- [ArduinoWebsockets Library](https://github.com/gilmaimon/ArduinoWebsockets)

### Herramientas de Desarrollo
- [Arduino IDE](https://www.arduino.cc/en/software)
- [PlatformIO](https://platformio.org/) (alternativa avanzada)
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)

---

**Nota**: Este sistema está diseñado específicamente para Max (Pet ID: 1). Para usar con otras mascotas, cambiar la constante `PET_ID` en el código.
