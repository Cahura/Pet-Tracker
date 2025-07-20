#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPSPlus.h>

// Configuración de pines I2C para ESP32C6
#define SDA_PIN 8
#define SCL_PIN 9

// Configuración de pines UART para GPS
#define GPS_RX 17  // RX del ESP32 (conectado al TX del GPS)
#define GPS_TX 16  // TX del ESP32 (conectado al RX del GPS)

// Configuración WiFi (OBLIGATORIO CAMBIAR POR TUS CREDENCIALES)
const char* ssid = "TU_WIFI_SSID";           
const char* password = "TU_WIFI_PASSWORD";    

// Configuración WebSocket optimizada para Railway
const char* ws_host = "pet-tracker-production.up.railway.app";
const int ws_port = 443;
const char* ws_path = "/ws";

// Objetos globales
WebSocketsClient ws;
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;
HardwareSerial SerialGPS(1);

// Variables de timing optimizadas
unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 8000; // Enviar cada 8 segundos para conservar batería
unsigned long lastGPSUpdate = 0;
const unsigned long GPS_UPDATE_INTERVAL = 10000; // Actualizar GPS cada 10 segundos
unsigned long lastReconnect = 0;
const unsigned long RECONNECT_INTERVAL = 30000; // Reintentar conexión cada 30 segundos

// Estados de conexión
bool wifiConnected = false;
bool wsConnected = false;
bool mpuInitialized = false;

// Variables para análisis de actividad
float previousLat = 0.0;
float previousLng = 0.0;
unsigned long lastGPSTime = 0;
float currentSpeed = 0.0; // Velocidad en m/s
float averageAccelMagnitude = 0.0;
int activitySamples = 0;
const int MAX_ACTIVITY_SAMPLES = 5; // Promediar últimas 5 muestras

// Buffer para datos JSON
StaticJsonDocument<512> jsonDoc;

// Función optimizada para manejar eventos WebSocket
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("❌ WebSocket desconectado!");
      wsConnected = false;
      break;
      
    case WStype_CONNECTED:
      Serial.printf("✅ WebSocket conectado a: %s\n", payload);
      wsConnected = true;
      break;
      
    case WStype_TEXT:
      Serial.printf("📨 Mensaje recibido: %s\n", payload);
      break;
      
    case WStype_ERROR:
      Serial.printf("❌ Error WebSocket: %s\n", payload);
      wsConnected = false;
      break;
      
    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=== INICIANDO ESP32C6 PET TRACKER OPTIMIZADO ===");

  // Inicializar I2C para MPU6050
  Serial.print("Inicializando I2C... ");
  Wire.begin(SDA_PIN, SCL_PIN);
  Serial.println("OK");

  // Inicializar GPS UART
  Serial.print("Inicializando GPS UART... ");
  SerialGPS.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  Serial.println("OK");

  // Conectar a WiFi con timeout
  Serial.print("Conectando a WiFi");
  WiFi.begin(ssid, password);
  
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 20) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi conectado!");
    Serial.printf("📍 IP: %s\n", WiFi.localIP().toString().c_str());
    wifiConnected = true;
  } else {
    Serial.println("\n❌ Error conectando WiFi");
    wifiConnected = false;
  }

  // Inicializar MPU6050 con manejo de errores
  Serial.print("Inicializando MPU6050... ");
  if (mpu.begin()) {
    // Configuración optimizada del sensor
    mpu.setAccelerometerRange(MPU6050_RANGE_4_G);    // Rango aumentado para mejor detección
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);         // Rango aumentado para mejor detección
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);      // Filtro para reducir ruido
    Serial.println("OK");
    mpuInitialized = true;
  } else {
    Serial.println("❌ FALLÓ (continuará sin IMU)");
    mpuInitialized = false;
  }

  // Configurar WebSocket
  if (wifiConnected) {
    Serial.print("Configurando WebSocket... ");
    ws.beginSSL(ws_host, ws_port, ws_path);
    ws.onEvent(webSocketEvent);
    ws.setReconnectInterval(5000);  // Reconexión automática cada 5 segundos
    Serial.println("OK");
  }
  
  Serial.println("=== SISTEMA INICIADO ===");
}

void loop() {
  // Mantener conexión WebSocket activa
  ws.loop();
  
  // Procesar datos GPS continuamente
  while (SerialGPS.available() > 0) {
    if (gps.encode(SerialGPS.read())) {
      // GPS ha recibido una nueva sentencia completa
    }
  }

  // Verificar si es momento de enviar datos
  unsigned long now = millis();
  if (now - lastSend >= SEND_INTERVAL) {
    if (wifiConnected && wsConnected) {
      sendOptimizedPetData();
      lastSend = now;
    } else {
      // Intentar reconectar si es necesario
      attemptReconnection();
    }
  }
}

void sendOptimizedPetData() {
  // Limpiar documento JSON
  jsonDoc.clear();
  
  // Datos básicos del dispositivo
  jsonDoc["petId"] = 1;
  jsonDoc["deviceId"] = "ESP32C6_MAX";
  jsonDoc["timestamp"] = millis();
  jsonDoc["battery"] = calculateBatteryLevel();
  
  // Campo de estado de conexión - indica que el ESP32C6 está activo
  jsonDoc["connectionStatus"] = "connected";
  jsonDoc["deviceActive"] = true;

  // Obtener y analizar datos GPS
  bool gpsValid = false;
  float currentLat = 0.0, currentLng = 0.0;
  
  if (gps.location.isValid() && gps.location.age() < 5000) { // GPS válido si es reciente (5 seg)
    currentLat = gps.location.lat();
    currentLng = gps.location.lng();
    
    jsonDoc["latitude"] = currentLat;
    jsonDoc["longitude"] = currentLng;
    jsonDoc["gps_valid"] = true;
    jsonDoc["gps_satellites"] = gps.satellites.value();
    jsonDoc["gps_hdop"] = gps.hdop.hdop();
    
    // Calcular velocidad basada en GPS
    if (previousLat != 0.0 && previousLng != 0.0 && lastGPSTime > 0) {
      float distance = calculateDistance(previousLat, previousLng, currentLat, currentLng);
      float timeElapsed = (millis() - lastGPSTime) / 1000.0; // en segundos
      
      if (timeElapsed > 0) {
        currentSpeed = distance / timeElapsed; // m/s
        jsonDoc["gps_speed"] = currentSpeed;
        jsonDoc["gps_speed_kmh"] = currentSpeed * 3.6; // km/h
      }
    }
    
    // Actualizar posición anterior
    previousLat = currentLat;
    previousLng = currentLng;
    lastGPSTime = millis();
    gpsValid = true;
  } else {
    jsonDoc["latitude"] = nullptr;
    jsonDoc["longitude"] = nullptr;
    jsonDoc["gps_valid"] = false;
    jsonDoc["gps_speed"] = 0.0;
    currentSpeed = 0.0;
  }

  // Obtener datos IMU si está disponible
  float accelX = 0, accelY = 0, accelZ = 0;
  float gyroX = 0, gyroY = 0, gyroZ = 0;
  float tempC = 25.0; // Temperatura por defecto
  String activity = "unknown";
  float imuMagnitude = 0.0;

  if (mpuInitialized) {
    sensors_event_t accelEvent, gyroEvent, tempEvent;
    mpu.getEvent(&accelEvent, &gyroEvent, &tempEvent);
    
    accelX = accelEvent.acceleration.x;
    accelY = accelEvent.acceleration.y;
    accelZ = accelEvent.acceleration.z;
    gyroX = gyroEvent.gyro.x;
    gyroY = gyroEvent.gyro.y;
    gyroZ = gyroEvent.gyro.z;
    tempC = tempEvent.temperature;
    
    // Calcular magnitud total del acelerómetro
    imuMagnitude = sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);
    
    // Actualizar promedio de aceleración para análisis más estable
    averageAccelMagnitude = ((averageAccelMagnitude * activitySamples) + imuMagnitude) / (activitySamples + 1);
    if (activitySamples < MAX_ACTIVITY_SAMPLES) {
      activitySamples++;
    }
    
    // Análisis avanzado de actividad combinando IMU y GPS
    activity = analyzeAdvancedActivity(averageAccelMagnitude, currentSpeed, gyroX, gyroY, gyroZ, gpsValid);
  } else {
    // Sin IMU, usar solo GPS para determinar actividad básica
    activity = analyzeGPSOnlyActivity(currentSpeed, gpsValid);
  }

  // Agregar datos IMU al JSON
  JsonObject accel = jsonDoc.createNestedObject("accelerometer");
  accel["x"] = accelX;
  accel["y"] = accelY;
  accel["z"] = accelZ;

  JsonObject gyro = jsonDoc.createNestedObject("gyroscope");
  gyro["x"] = gyroX;
  gyro["y"] = gyroY;
  gyro["z"] = gyroZ;

  jsonDoc["temperature"] = tempC;
  jsonDoc["activity"] = activity;
  jsonDoc["imu_magnitude"] = imuMagnitude;
  jsonDoc["imu_average"] = averageAccelMagnitude;
  
  // Información adicional del estado del dispositivo
  jsonDoc["wifi_rssi"] = WiFi.RSSI();
  jsonDoc["free_heap"] = ESP.getFreeHeap();
  jsonDoc["uptime_ms"] = millis();
  
  // Metadatos de análisis
  jsonDoc["analysis_method"] = mpuInitialized ? "imu_gps_combined" : "gps_only";
  jsonDoc["data_quality"] = gpsValid ? "high" : "medium";

  // Convertir a string y enviar
  String jsonString;
  serializeJson(jsonDoc, jsonString);
  
  if (ws.sendTXT(jsonString)) {
    Serial.println("📤 Datos enviados: " + jsonString);
  } else {
    Serial.println("❌ Error enviando datos WebSocket");
    wsConnected = false;
  }
}

// Función avanzada para análisis de actividad combinando IMU y GPS
String analyzeAdvancedActivity(float accelMagnitude, float speed, float gyroX, float gyroY, float gyroZ, bool gpsValid) {
  float gyroMagnitude = sqrt(gyroX * gyroX + gyroY * gyroY + gyroZ * gyroZ);
  
  // Convertir velocidad a km/h para análisis
  float speedKmh = speed * 3.6;
  
  Serial.printf("🔍 Análisis: Accel=%.2f, Speed=%.2f km/h, Gyro=%.2f\n", accelMagnitude, speedKmh, gyroMagnitude);
  
  // Prioridad 1: Velocidad muy alta (probable vehículo)
  if (gpsValid && speedKmh > 15.0) {
    return "traveling"; // En vehículo/transporte
  }
  
  // Prioridad 2: Actividad alta con velocidad moderada (corriendo)
  if (accelMagnitude > 15.0 && gyroMagnitude > 2.5 && speedKmh >= 6.0 && speedKmh <= 15.0) {
    return "running";
  }
  
  // Prioridad 3: Actividad moderada con velocidad baja (caminando)
  if (accelMagnitude > 11.0 && gyroMagnitude > 1.0 && speedKmh >= 1.0 && speedKmh < 6.0) {
    return "walking";
  }
  
  // Prioridad 4: Actividad mínima o sin movimiento GPS (descansando)
  if (accelMagnitude <= 11.0 || speedKmh < 1.0) {
    return "resting";
  }
  
  // Caso por defecto: usar solo IMU si GPS no es confiable
  if (accelMagnitude > 15.0 && gyroMagnitude > 2.5) {
    return "running";
  } else if (accelMagnitude > 11.0 && gyroMagnitude > 1.0) {
    return "walking";
  } else {
    return "resting";
  }
}

// Función para análisis basado solo en GPS (cuando IMU no está disponible)
String analyzeGPSOnlyActivity(float speed, bool gpsValid) {
  if (!gpsValid) {
    return "unknown";
  }
  
  float speedKmh = speed * 3.6;
  
  if (speedKmh > 15.0) {
    return "traveling";
  } else if (speedKmh >= 6.0) {
    return "running";
  } else if (speedKmh >= 1.0) {
    return "walking";
  } else {
    return "resting";
  }
}

// Función para calcular distancia entre dos puntos GPS (fórmula haversine)
float calculateDistance(float lat1, float lng1, float lat2, float lng2) {
  const float R = 6371000; // Radio de la Tierra en metros
  float dLat = (lat2 - lat1) * PI / 180.0;
  float dLng = (lng2 - lng1) * PI / 180.0;
  
  float a = sin(dLat/2) * sin(dLat/2) +
            cos(lat1 * PI / 180.0) * cos(lat2 * PI / 180.0) *
            sin(dLng/2) * sin(dLng/2);
  float c = 2 * atan2(sqrt(a), sqrt(1-a));
  
  return R * c; // Distancia en metros
}

// Función para calcular nivel de batería (simulado)
int calculateBatteryLevel() {
  // En un proyecto real, leerías el voltaje de la batería
  // Aquí simulamos una batería que va bajando lentamente
  static int batteryLevel = 100;
  static unsigned long lastBatteryUpdate = 0;
  
  if (millis() - lastBatteryUpdate > 300000) { // Cada 5 minutos
    batteryLevel = max(10, batteryLevel - 1); // Nunca bajar de 10%
    lastBatteryUpdate = millis();
  }
  
  return batteryLevel;
}

// Función para intentar reconexión
void attemptReconnection() {
  unsigned long now = millis();
  
  if (now - lastReconnect < RECONNECT_INTERVAL) {
    return; // No es momento de reintentar
  }
  
  lastReconnect = now;
  
  // Verificar WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("🔄 Reintentando conexión WiFi...");
    WiFi.begin(ssid, password);
    wifiConnected = false;
    return;
  } else {
    wifiConnected = true;
  }
  
  // Verificar WebSocket
  if (!wsConnected) {
    Serial.println("� Reintentando conexión WebSocket...");
    ws.beginSSL(ws_host, ws_port, ws_path);
  }
}