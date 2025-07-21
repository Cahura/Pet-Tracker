#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPSPlus.h>
#include "config.h"  // Archivo de configuración separado

// ============================================================================
// CONFIGURACIÓN DE HARDWARE
// ============================================================================

// Pines I2C para ESP32C6
#define SDA_PIN 6
#define SCL_PIN 7

// GPS UART pines (ESP32C6)
#define GPS_RX_PIN 4
#define GPS_TX_PIN 5
#define GPS_BAUDRATE 9600

// ============================================================================
// CONFIGURACIÓN DE RED (desde config.h)
// ============================================================================

// WiFi credentials se cargan desde config.h
const char* ssid = WIFI_SSID;
const char* password = WIFI_PASSWORD;

// WebSocket para Railway (desde config.h)
const char* ws_host = WS_HOST;
const int ws_port = WS_PORT;
const char* ws_path = WS_PATH;

// ============================================================================
// OBJETOS GLOBALES
// ============================================================================

WebSocketsClient ws;
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;
HardwareSerial SerialGPS(1);
DynamicJsonDocument jsonDoc(1536); // Reducido de 2048 a 1536

// ============================================================================
// CONFIGURACIÓN DE TIMING (desde config.h)
// ============================================================================

// Intervalos inteligentes según actividad
const unsigned long INTERVAL_STATIONARY = 30000;    // 30 segundos si está quieto
const unsigned long INTERVAL_MOVING = 5000;         // 5 segundos si se mueve
const unsigned long INTERVAL_FAST_MOVING = 2000;    // 2 segundos si se mueve rápido

unsigned long lastSend = 0;
unsigned long lastGPSDebug = 0;
unsigned long lastReconnect = 0;
unsigned long currentSendInterval = INTERVAL_STATIONARY;

// ============================================================================
// ESTADOS DEL SISTEMA
// ============================================================================

bool wifiConnected = false;
bool wsConnected = false;
bool mpuInitialized = false;
bool gpsInitialized = false;
bool gpsReady = false;

// ============================================================================
// ANÁLISIS DE ACTIVIDAD
// ============================================================================

// ============================================================================
// ANÁLISIS DE ACTIVIDAD Y MOVIMIENTO
// ============================================================================

// Variables de posición GPS
float previousLat = 0.0;
float previousLng = 0.0;
unsigned long lastGPSTime = 0;
float currentSpeed = 0.0;

// Variables de movimiento y zona segura
bool isInSafeZone = false;
bool isMoving = false;
float stationaryThreshold = 10.0;  // metros
float movingThreshold = 1.0;       // m/s
float fastMovingThreshold = 3.0;   // m/s

// Buffer para análisis de trayectoria
struct TrackPoint {
  float lat;
  float lng;
  unsigned long timestamp;
  float speed;
  String activity;
};

const int MAX_TRACK_POINTS = 50;
TrackPoint routeBuffer[MAX_TRACK_POINTS];
int routeBufferIndex = 0;
bool isRecordingRoute = false;

// Variables IMU
const int MAX_SAMPLES = 8; // Reducido de 10 a 8
float accelBuffer[MAX_SAMPLES];
float gyroBuffer[MAX_SAMPLES];
int bufferIndex = 0;
int sampleCount = 0;
float avgAccelMag = 0.0;
float avgGyroMag = 0.0;

// Umbrales optimizados para pet tracker
struct {
  float lying_accel = 9.2, lying_gyro = 0.5;
  float sitting_accel = 10.5, sitting_gyro = 1.2;
  float standing_accel = 11.8, standing_gyro = 2.0;
  float walking_accel = 13.5, walking_gyro = 3.5;
  float running_accel = 16.0, running_gyro = 5.5;
  float playing_accel = 18.0, playing_gyro = 7.0;
} thresholds;

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== ESP32C6 PET TRACKER v2.0 ===");
  
  // Inicialización en orden de prioridad
  initializeI2C();
  initializeMPU6050();
  initializeGPS();
  initializeWiFi();
  initializeWebSocket();
  
  Serial.println("=== SISTEMA LISTO ===");
  printSystemStatus();
}

void loop() {
  // Mantener conexiones activas
  if (wifiConnected) {
    ws.loop();
  }
  
  // Procesar datos GPS
  processGPSData();
  
  // Procesar datos IMU para análisis de movimiento
  if (mpuInitialized) {
    processIMUData();
  }
  
  // Determinar estado de movimiento y ajustar intervalo
  analyzeMovementAndAdjustInterval();
  
  // Enviar datos según el intervalo inteligente
  if (millis() - lastSend >= currentSendInterval) {
    if (wifiConnected && wsConnected) {
      sendPetData();
      lastSend = millis();
    } else {
      attemptReconnection();
    }
  }
  
  // Debug GPS periódico
  if (millis() - lastGPSDebug >= GPS_DEBUG_INTERVAL) {
    debugGPSStatus();
    lastGPSDebug = millis();
  }
  
  delay(10); // Pequeño delay para eficiencia
}

// ============================================================================
// INICIALIZACIÓN DEL HARDWARE
// ============================================================================

void initializeI2C() {
  Serial.print("Inicializando I2C... ");
  Wire.begin(SDA_PIN, SCL_PIN);
  delay(100);
  Serial.println("✅ OK");
}

void initializeMPU6050() {
  Serial.print("Inicializando MPU6050... ");
  
  if (mpu.begin()) {
    mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    mpuInitialized = true;
    Serial.println("✅ OK");
  } else {
    mpuInitialized = false;
    Serial.println("❌ Error (continuará sin IMU)");
  }
}

void initializeGPS() {
  Serial.print("Inicializando GPS... ");
  
  SerialGPS.begin(GPS_BAUDRATE, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  delay(500);
  gpsInitialized = true;
  
  Serial.println("✅ OK");
  
  // Test rápido de comunicación GPS
  testGPSCommunication();
}

void initializeWiFi() {
  Serial.print("Conectando WiFi");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✅ WiFi conectado!");
    Serial.printf("📍 IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    wifiConnected = false;
    Serial.println("\n❌ WiFi falló");
  }
}

void initializeWebSocket() {
  if (!wifiConnected) return;
  
  Serial.print("Configurando WebSocket... ");
  
  ws.beginSSL(ws_host, ws_port, ws_path);
  ws.onEvent(webSocketEvent);
  ws.setReconnectInterval(5000);
  ws.enableHeartbeat(15000, 3000, 2);
  ws.setExtraHeaders("Origin: https://pet-tracker-production.up.railway.app");
  
  Serial.println("✅ OK");
  
  // Intentar conexión inicial
  unsigned long start = millis();
  while (!wsConnected && (millis() - start < 10000)) {
    ws.loop();
    delay(100);
  }
  
  if (wsConnected) {
    Serial.println("✅ WebSocket conectado!");
  } else {
    Serial.println("⚠️ WebSocket pendiente...");
  }
}

// ============================================================================
// PROCESAMIENTO DE DATOS GPS
// ============================================================================

void processGPSData() {
  static int charsProcessed = 0;
  static int validSentences = 0;
  
  while (SerialGPS.available()) {
    char c = SerialGPS.read();
    charsProcessed++;
    
    if (gps.encode(c)) {
      validSentences++;
      
      if (gps.location.isUpdated()) {
        if (!gpsReady) {
          gpsReady = true;
          Serial.printf("🛰️ GPS LISTO: %.6f, %.6f\n", 
                       gps.location.lat(), gps.location.lng());
        }
        
        // Log cada actualización de ubicación para debugging
        Serial.printf("📍 NUEVA UBICACIÓN: %.6f, %.6f (sats: %d, hdop: %.2f)\n", 
                     gps.location.lat(), gps.location.lng(), 
                     gps.satellites.value(), gps.hdop.hdop());
        
        // Forzar envío inmediato de nueva ubicación si está conectado
        if (wifiConnected && wsConnected) {
          Serial.println("🚀 Enviando nueva ubicación inmediatamente...");
          sendPetData();
          lastSend = millis(); // Actualizar timestamp para evitar envío doble
        }
      }
      
      // Log cuando recibimos otras sentencias GPS
      if (gps.satellites.isUpdated()) {
        Serial.printf("🛰️ Satélites actualizados: %d\n", gps.satellites.value());
      }
    }
  }
}

void testGPSCommunication() {
  Serial.println("🔍 Test GPS (5 segundos)...");
  
  unsigned long start = millis();
  int chars = 0;
  
  while (millis() - start < 5000) {
    if (SerialGPS.available()) {
      SerialGPS.read();
      chars++;
    }
    delay(10);
  }
  
  Serial.printf("📊 GPS: %d caracteres recibidos\n", chars);
  
  if (chars > 0) {
    Serial.println("✅ GPS comunicándose");
  } else {
    Serial.println("❌ GPS sin datos - verificar conexiones");
  }
}

void debugGPSStatus() {
  Serial.println("📡 ====== ESTADO GPS DETALLADO ======");
  Serial.printf("   Ubicación válida: %s\n", gps.location.isValid() ? "SÍ" : "NO");
  Serial.printf("   Satélites: %d\n", gps.satellites.value());
  Serial.printf("   HDOP: %.2f\n", gps.hdop.hdop());
  Serial.printf("   Tiempo válido: %s\n", gps.time.isValid() ? "SÍ" : "NO");
  Serial.printf("   Fecha válida: %s\n", gps.date.isValid() ? "SÍ" : "NO");
  
  if (gps.location.isValid()) {
    Serial.printf("   📍 Coordenadas: %.6f, %.6f\n", 
                 gps.location.lat(), gps.location.lng());
    Serial.printf("   ⏰ Edad ubicación: %lu ms\n", gps.location.age());
    Serial.printf("   🎯 Precisión: %.2f metros\n", gps.hdop.hdop() * 5.0);
  } else {
    Serial.println("   ❌ Sin ubicación válida");
  }
  
  if (gps.time.isValid()) {
    Serial.printf("   🕒 Hora GPS: %02d:%02d:%02d\n", 
                 gps.time.hour(), gps.time.minute(), gps.time.second());
  }
  
  Serial.printf("   🔗 GPS Ready: %s\n", gpsReady ? "SÍ" : "NO");
  Serial.printf("   📊 Caracteres procesados desde último debug\n");
  Serial.println("=====================================");
}

// ============================================================================
// ANÁLISIS INTELIGENTE DE MOVIMIENTO
// ============================================================================

void processIMUData() {
  sensors_event_t accelEvent, gyroEvent, tempEvent;
  mpu.getEvent(&accelEvent, &gyroEvent, &tempEvent);
  
  // Calcular magnitudes
  float accelMag = sqrt(accelEvent.acceleration.x * accelEvent.acceleration.x + 
                       accelEvent.acceleration.y * accelEvent.acceleration.y + 
                       accelEvent.acceleration.z * accelEvent.acceleration.z);
  
  float gyroMag = sqrt(gyroEvent.gyro.x * gyroEvent.gyro.x + 
                      gyroEvent.gyro.y * gyroEvent.gyro.y + 
                      gyroEvent.gyro.z * gyroEvent.gyro.z);
  
  // Agregar a buffer circular
  accelBuffer[bufferIndex] = accelMag;
  gyroBuffer[bufferIndex] = gyroMag;
  
  bufferIndex = (bufferIndex + 1) % MAX_SAMPLES;
  if (sampleCount < MAX_SAMPLES) sampleCount++;
  
  // Calcular promedios
  float accelSum = 0, gyroSum = 0;
  for (int i = 0; i < sampleCount; i++) {
    accelSum += accelBuffer[i];
    gyroSum += gyroBuffer[i];
  }
  
  avgAccelMag = accelSum / sampleCount;
  avgGyroMag = gyroSum / sampleCount;
}

void analyzeMovementAndAdjustInterval() {
  // Analizar movimiento basado en GPS
  bool gpsMoving = (currentSpeed > movingThreshold);
  bool gpsFastMoving = (currentSpeed > fastMovingThreshold);
  
  // Analizar movimiento basado en IMU
  bool imuMoving = false;
  if (mpuInitialized && sampleCount >= 3) {
    // Usar umbrales dinámicos para detectar movimiento
    imuMoving = (avgAccelMag > thresholds.sitting_accel || avgGyroMag > thresholds.sitting_gyro);
  }
  
  // Determinar estado de movimiento combinado
  isMoving = gpsMoving || imuMoving;
  
  // Ajustar intervalo según estado de movimiento
  unsigned long previousInterval = currentSendInterval;
  
  if (gpsFastMoving) {
    currentSendInterval = INTERVAL_FAST_MOVING;
    if (!isRecordingRoute) {
      Serial.println("🏃‍♂️ MOVIMIENTO RÁPIDO DETECTADO - Iniciando grabación de ruta");
      startRouteRecording();
    }
  } else if (isMoving) {
    currentSendInterval = INTERVAL_MOVING;
    if (!isRecordingRoute) {
      Serial.println("🚶‍♂️ MOVIMIENTO DETECTADO - Iniciando grabación de ruta");
      startRouteRecording();
    }
  } else {
    currentSendInterval = INTERVAL_STATIONARY;
    if (isRecordingRoute) {
      Serial.println("🛑 MOVIMIENTO DETENIDO - Guardando ruta");
      stopRouteRecording();
    }
  }
  
  // Log cambios de intervalo
  if (previousInterval != currentSendInterval) {
    Serial.printf("⏱️ Intervalo cambiado: %lu ms -> %lu ms\n", 
                 previousInterval, currentSendInterval);
    Serial.printf("   GPS Speed: %.2f m/s, IMU Moving: %s\n", 
                 currentSpeed, imuMoving ? "SÍ" : "NO");
  }
}

void startRouteRecording() {
  isRecordingRoute = true;
  routeBufferIndex = 0;
  Serial.println("📍 Iniciando grabación de ruta");
}

void stopRouteRecording() {
  if (isRecordingRoute && routeBufferIndex > 2) {
    Serial.printf("💾 Guardando ruta con %d puntos\n", routeBufferIndex);
    sendRouteData();
  }
  isRecordingRoute = false;
  routeBufferIndex = 0;
}

void addRoutePoint(float lat, float lng, float speed, String activity) {
  if (isRecordingRoute && routeBufferIndex < MAX_TRACK_POINTS) {
    routeBuffer[routeBufferIndex] = {
      lat, lng, millis(), speed, activity
    };
    routeBufferIndex++;
    
    Serial.printf("📌 Punto de ruta %d: %.6f, %.6f (%.2f m/s)\n", 
                 routeBufferIndex, lat, lng, speed);
  }
}

void sendRouteData() {
  if (routeBufferIndex == 0) return;
  
  jsonDoc.clear();
  jsonDoc["type"] = "route_data";
  jsonDoc["petId"] = PET_ID;
  jsonDoc["deviceId"] = DEVICE_ID;
  jsonDoc["timestamp"] = millis();
  jsonDoc["pointCount"] = routeBufferIndex;
  
  JsonArray points = jsonDoc.createNestedArray("route");
  
  for (int i = 0; i < routeBufferIndex; i++) {
    JsonObject point = points.createNestedObject();
    point["lat"] = routeBuffer[i].lat;
    point["lng"] = routeBuffer[i].lng;
    point["timestamp"] = routeBuffer[i].timestamp;
    point["speed"] = routeBuffer[i].speed;
    point["activity"] = routeBuffer[i].activity;
  }
  
  String message;
  serializeJson(jsonDoc, message);
  
  if (wsConnected) {
    ws.sendTXT(message);
    Serial.printf("📤 Ruta enviada con %d puntos\n", routeBufferIndex);
  }
}

// ============================================================================
// ANÁLISIS DE ACTIVIDAD OPTIMIZADO
// ============================================================================

String analyzeActivity(float accelMag, float gyroMag, float speed, bool hasGPS) {
  float speedKmh = speed * 3.6;
  
  // Análisis por velocidad GPS (más confiable)
  if (hasGPS) {
    if (speedKmh > 20.0) return "traveling";
    if (speedKmh >= 8.0) return "running";
    if (speedKmh >= 2.0) return "walking";
  }
  
  // Análisis por IMU
  if (accelMag > thresholds.playing_accel && gyroMag > thresholds.playing_gyro) {
    return "playing";
  }
  if (accelMag > thresholds.running_accel && gyroMag > thresholds.running_gyro) {
    return "running";
  }
  if (accelMag > thresholds.walking_accel && gyroMag > thresholds.walking_gyro) {
    return "walking";
  }
  if (accelMag > thresholds.standing_accel && gyroMag > thresholds.standing_gyro) {
    return "standing";
  }
  if (accelMag <= thresholds.lying_accel && gyroMag <= thresholds.lying_gyro) {
    return "lying";
  }
  
  return "resting";
}

float calculateActivityConfidence(const String& activity, float accelMag, float gyroMag, bool hasGPS) {
  float confidence = 0.6; // Base
  
  if (hasGPS) confidence += 0.2;
  
  if (activity == "lying" && accelMag < 10.0) confidence = 0.95;
  else if (activity == "running" && accelMag > 16.0) confidence = 0.90;
  else if (activity == "walking" && accelMag > 12.0) confidence = 0.85;
  
  return constrain(confidence, 0.3, 0.99);
}

int calculateMovementIntensity(float accelMag, float gyroMag) {
  float intensity = ((accelMag - 9.0) * 4.0 + gyroMag * 12.0) / 2.0;
  return constrain((int)intensity, 0, 100);
}

String analyzePosture(float accelX, float accelY, float accelZ) {
  float totalMag = sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);
  
  if (totalMag < 0.1) return "unknown";
  
  // Normalizar componentes
  float normX = accelX / totalMag;
  float normY = accelY / totalMag;
  float normZ = accelZ / totalMag;
  
  // Analizar orientación del sensor en la espalda
  if (abs(normZ) > 0.8) {
    return abs(accelZ) > 9.5 ? "upright" : "upside_down";
  } else if (abs(normY) > 0.6) {
    return normY > 0 ? "forward_lean" : "backward_lean";
  } else if (abs(normX) > 0.6) {
    return normX > 0 ? "right_lean" : "left_lean";
  } else {
    return "tilted";
  }
}

// ============================================================================
// ENVÍO DE DATOS
// ============================================================================

void sendPetData() {
  jsonDoc.clear();
  
  // Datos básicos (usando config.h)
  jsonDoc["petId"] = PET_ID;
  jsonDoc["deviceId"] = DEVICE_ID;
  jsonDoc["timestamp"] = millis();
  jsonDoc["battery"] = calculateBatteryLevel();
  jsonDoc["connectionStatus"] = "connected";
  jsonDoc["deviceActive"] = true; // Agregar este campo que el backend puede necesitar
  
  // Datos GPS
  bool gpsValid = gps.location.isValid() && gps.location.age() < GPS_TIMEOUT;
  
  if (gpsValid) {
    float lat = gps.location.lat();
    float lng = gps.location.lng();
    
    // Verificar que las coordenadas sean razonables
    if (lat >= -90.0 && lat <= 90.0 && lng >= -180.0 && lng <= 180.0 && 
        lat != 0.0 && lng != 0.0) {
      
      jsonDoc["latitude"] = lat;
      jsonDoc["longitude"] = lng;
      jsonDoc["gps_valid"] = true;
      jsonDoc["gps_satellites"] = gps.satellites.value();
      jsonDoc["gps_hdop"] = gps.hdop.hdop();
      jsonDoc["gps_source"] = "esp32c6_nmea"; // Identificar fuente de datos
      
      // Log detallado de coordenadas enviadas
      Serial.printf("📍 ENVIANDO COORDS: lat=%.6f, lng=%.6f, edad=%lu ms\n", 
                   lat, lng, gps.location.age());
      Serial.printf("🌍 COORDENADAS ENVIADAS AL BACKEND:\n");
      Serial.printf("   latitude: %.6f\n", lat);
      Serial.printf("   longitude: %.6f\n", lng);
      Serial.printf("   Tu ubicación debería estar en: https://www.google.com/maps?q=%.6f,%.6f\n", lat, lng);
      
      // Calcular velocidad solo si tenemos posición anterior válida
      if (previousLat != 0.0 && previousLng != 0.0 && lastGPSTime > 0) {
        float distance = calculateDistance(previousLat, previousLng, lat, lng);
        float timeElapsed = (millis() - lastGPSTime) / 1000.0;
        
        if (timeElapsed > 0 && timeElapsed < 300) { // Solo si es menor a 5 minutos
          currentSpeed = distance / timeElapsed;
          jsonDoc["gps_speed"] = currentSpeed;
          jsonDoc["gps_speed_kmh"] = currentSpeed * 3.6;
          
          Serial.printf("🏃 Velocidad: %.2f m/s (%.2f km/h), distancia: %.2f m\n", 
                       currentSpeed, currentSpeed * 3.6, distance);
        }
      }
      
      // Actualizar posición anterior SIEMPRE que tengamos coordenadas válidas
      previousLat = lat;
      previousLng = lng;
      lastGPSTime = millis();
      
    } else {
      Serial.printf("❌ Coordenadas inválidas: lat=%.6f, lng=%.6f\n", lat, lng);
      jsonDoc["latitude"] = nullptr;
      jsonDoc["longitude"] = nullptr;
      jsonDoc["gps_valid"] = false;
      jsonDoc["gps_speed"] = 0.0;
      currentSpeed = 0.0;
    }
    
  } else {
    jsonDoc["latitude"] = nullptr;
    jsonDoc["longitude"] = nullptr;
    jsonDoc["gps_valid"] = false;
    jsonDoc["gps_speed"] = 0.0;
    jsonDoc["gps_source"] = "none"; // Sin fuente GPS válida
    currentSpeed = 0.0;
    
    if (gps.location.isValid()) {
      Serial.printf("❌ GPS válido pero datos antiguos (edad: %lu ms)\n", gps.location.age());
    } else {
      Serial.println("❌ GPS ubicación no válida");
    }
  }
  
  // Datos IMU
  float accelX = 0, accelY = 0, accelZ = 0;
  float gyroX = 0, gyroY = 0, gyroZ = 0;
  float tempC = 25.0;
  float accelMag = 0.0;
  String activity = "unknown";
  
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
    
    accelMag = sqrt(accelX*accelX + accelY*accelY + accelZ*accelZ);
    float gyroMag = sqrt(gyroX*gyroX + gyroY*gyroY + gyroZ*gyroZ);
    
    // Actualizar buffers para promedio móvil
    accelBuffer[bufferIndex] = accelMag;
    gyroBuffer[bufferIndex] = gyroMag;
    bufferIndex = (bufferIndex + 1) % MAX_SAMPLES;
    
    if (sampleCount < MAX_SAMPLES) sampleCount++;
    
    // Calcular promedios
    float totalAccel = 0, totalGyro = 0;
    for (int i = 0; i < sampleCount; i++) {
      totalAccel += accelBuffer[i];
      totalGyro += gyroBuffer[i];
    }
    avgAccelMag = totalAccel / sampleCount;
    avgGyroMag = totalGyro / sampleCount;
    
    activity = analyzeActivity(avgAccelMag, avgGyroMag, currentSpeed, gpsValid);
    
  } else {
    // Sin IMU, análisis solo por GPS
    if (gpsValid) {
      float speedKmh = currentSpeed * 3.6;
      if (speedKmh > 15.0) activity = "running";
      else if (speedKmh > 3.0) activity = "walking";
      else activity = "resting";
    } else {
      activity = "resting";
    }
  }
  
  // Agregar datos al JSON
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
  jsonDoc["activity_confidence"] = calculateActivityConfidence(activity, avgAccelMag, avgGyroMag, gpsValid);
  jsonDoc["movement_intensity"] = calculateMovementIntensity(avgAccelMag, avgGyroMag);
  jsonDoc["imu_magnitude"] = accelMag;
  
  // Información adicional que el backend puede requerir
  jsonDoc["posture"] = analyzePosture(accelX, accelY, accelZ);
  jsonDoc["imu_average"] = avgAccelMag;
  jsonDoc["gyro_average"] = avgGyroMag;
  
  // Estado del sistema
  jsonDoc["wifi_rssi"] = WiFi.RSSI();
  jsonDoc["free_heap"] = ESP.getFreeHeap();
  jsonDoc["uptime_ms"] = millis();
  
  // Metadatos de análisis para el backend
  jsonDoc["analysis_method"] = mpuInitialized ? "imu_gps_combined" : "gps_only";
  jsonDoc["data_quality"] = gpsValid ? "high" : "medium";
  
  // Enviar datos
  String jsonString;
  serializeJson(jsonDoc, jsonString);
  
  Serial.printf("📤 Enviando: %s | GPS:%s | Sats:%d\n", 
                activity.c_str(), 
                gpsValid ? "✅" : "❌", 
                gps.satellites.value());
  
  // Log completo del JSON para debugging
  Serial.printf("📡 JSON COMPLETO: %s\n", jsonString.c_str());
  
  if (ws.sendTXT(jsonString)) {
    Serial.println("✅ Datos enviados exitosamente al backend");
    
    // Confirmar datos GPS específicos enviados
    if (jsonDoc["gps_valid"].as<bool>()) {
      Serial.printf("   ✅ GPS: %.6f, %.6f enviado correctamente\n", 
                   jsonDoc["latitude"].as<float>(), 
                   jsonDoc["longitude"].as<float>());
      
      // Agregar punto a la ruta si estamos grabando
      if (isRecordingRoute) {
        addRoutePoint(jsonDoc["latitude"].as<float>(), 
                     jsonDoc["longitude"].as<float>(), 
                     currentSpeed, 
                     activity);
      }
    }
  } else {
    Serial.println("❌ Error enviando datos - WebSocket desconectado");
    wsConnected = false;
  }
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

float calculateDistance(float lat1, float lng1, float lat2, float lng2) {
  const float R = 6371000; // Radio Tierra en metros
  float dLat = radians(lat2 - lat1);
  float dLng = radians(lng2 - lng1);
  
  float a = sin(dLat/2) * sin(dLat/2) + 
            cos(radians(lat1)) * cos(radians(lat2)) * 
            sin(dLng/2) * sin(dLng/2);
  
  return R * 2 * atan2(sqrt(a), sqrt(1-a));
}

int calculateBatteryLevel() {
  static int batteryLevel = 100;
  static unsigned long lastUpdate = 0;
  
  if (millis() - lastUpdate > 300000) { // Cada 5 minutos
    batteryLevel = max(10, batteryLevel - 1);
    lastUpdate = millis();
  }
  
  return batteryLevel;
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("❌ WebSocket desconectado del backend");
      wsConnected = false;
      break;
      
    case WStype_CONNECTED: {
      Serial.printf("✅ WebSocket conectado al backend: %s\n", payload);
      wsConnected = true;
      
      // Enviar mensaje de identificación con información detallada
      DynamicJsonDocument connectMsg(256);
      connectMsg["type"] = "device_connect";
      connectMsg["deviceId"] = "ESP32C6_OPTIMIZED";
      connectMsg["petId"] = 1;
      connectMsg["version"] = "2.0";
      connectMsg["capabilities"] = "gps,imu,activity";
      
      String connectStr;
      serializeJson(connectMsg, connectStr);
      ws.sendTXT(connectStr);
      
      Serial.printf("📡 Enviado mensaje de conexión: %s\n", connectStr.c_str());
      break;
    }
      
    case WStype_TEXT:
      Serial.printf("📨 Mensaje del backend: %s\n", payload);
      
      // Verificar si el backend confirma recepción de datos
      if (strstr((char*)payload, "data_received") != NULL) {
        Serial.println("✅ Backend confirmó recepción de datos de Max");
      }
      break;
      
    case WStype_ERROR:
      Serial.printf("❌ Error WebSocket: %s\n", payload);
      wsConnected = false;
      break;
      
    default:
      Serial.printf("🔍 Evento WebSocket: %d\n", type);
      break;
  }
}

void attemptReconnection() {
  if (millis() - lastReconnect < RECONNECT_INTERVAL) return;
  lastReconnect = millis();
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("🔄 Reconectando WiFi...");
    WiFi.begin(ssid, password);
    wifiConnected = false;
    wsConnected = false;
    return;
  }
  
  wifiConnected = true;
  
  if (!wsConnected) {
    Serial.println("🔄 Reconectando WebSocket...");
    ws.disconnect();
    delay(1000);
    ws.beginSSL(ws_host, ws_port, ws_path);
    ws.setExtraHeaders("Origin: https://pet-tracker-production.up.railway.app");
  }
}

void printSystemStatus() {
  Serial.println("📊 Estado del sistema:");
  Serial.printf("   WiFi: %s", wifiConnected ? "✅" : "❌");
  if (wifiConnected) {
    Serial.printf(" (RSSI: %d dBm)", WiFi.RSSI());
  }
  Serial.println();
  
  Serial.printf("   WebSocket: %s", wsConnected ? "✅" : "❌");
  if (wsConnected) {
    Serial.printf(" (Conectado a %s)", ws_host);
  }
  Serial.println();
  
  Serial.printf("   IMU: %s\n", mpuInitialized ? "✅" : "❌");
  Serial.printf("   GPS: %s", gpsInitialized ? "✅" : "❌");
  if (gpsReady) {
    Serial.printf(" (LISTO con %d sats)", gps.satellites.value());
  }
  Serial.println();
  
  Serial.printf("   Memoria libre: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("   Device ID: ESP32C6_OPTIMIZED\n");
  Serial.printf("   Pet ID: 1 (Max)\n");
  
  if (gpsReady && gps.location.isValid()) {
    Serial.printf("   📍 Última ubicación: %.6f, %.6f\n", 
                 gps.location.lat(), gps.location.lng());
  }
}
