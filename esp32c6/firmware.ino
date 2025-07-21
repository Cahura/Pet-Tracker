#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPSPlus.h>

// Configuración de pines I2C para ESP32C6 (corregidos)
#define SDA_PIN 6
#define SCL_PIN 7

// GPS usará UART1 con pines por defecto del ESP32C6

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
bool gpsInitialized = false; // Nueva variable para estado GPS
bool gpsReady = false; // GPS ha obtenido su primera ubicación válida

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
      // Enviar mensaje de identificación
      ws.sendTXT("{\"type\":\"device_connect\",\"deviceId\":\"ESP32C6_MAX\"}");
      break;
      
    case WStype_TEXT:
      Serial.printf("📨 Mensaje recibido: %s\n", payload);
      break;
      
    case WStype_ERROR:
      Serial.printf("❌ Error WebSocket: %s\n", payload);
      wsConnected = false;
      break;
      
    case WStype_FRAGMENT_TEXT_START:
    case WStype_FRAGMENT_BIN_START:
    case WStype_FRAGMENT:
    case WStype_FRAGMENT_FIN:
      Serial.println("📦 Fragmento WebSocket recibido");
      break;
      
    case WStype_PING:
      Serial.println("🏓 Ping WebSocket");
      break;
      
    case WStype_PONG:
      Serial.println("🏓 Pong WebSocket");
      break;
      
    default:
      Serial.printf("🔍 Evento WebSocket desconocido: %d\n", type);
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(2000); // Delay mayor para estabilización
  
  Serial.println();
  Serial.println("=== INICIANDO ESP32C6 PET TRACKER OPTIMIZADO ===");
  Serial.flush(); // Asegurar que se imprima

  // Inicializar I2C para MPU6050 primero
  Serial.print("Inicializando I2C (SDA=6, SCL=7)... ");
  Serial.flush();
  Wire.begin(SDA_PIN, SCL_PIN);
  delay(100);
  Serial.println("OK");

  // Inicializar MPU6050 con manejo de errores ANTES del GPS
  Serial.print("Inicializando MPU6050... ");
  Serial.flush();
  if (mpu.begin()) {
    // Configuración optimizada del sensor
    mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println("OK");
    mpuInitialized = true;
  } else {
    Serial.println("❌ FALLÓ (continuará sin IMU)");
    mpuInitialized = false;
  }

  // Inicializar GPS UART de forma simple
  Serial.print("Inicializando GPS UART... ");
  Serial.flush();
  
  // Inicialización GPS ultra-simple
  SerialGPS.begin(9600, SERIAL_8N1, -1, -1, false, 20000UL); // Usar pines por defecto
  delay(100); // Delay mínimo
  
  Serial.println("OK (GPS en segundo plano)");
  gpsInitialized = true; // Asumir que está disponible

  // Conectar a WiFi con timeout y mejor manejo
  Serial.print("Conectando a WiFi");
  Serial.flush();
  WiFi.begin(ssid, password);
  
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 30) { // Más intentos
    delay(500);
    Serial.print(".");
    wifiAttempts++;
    
    // Watchdog reset prevention
    if (wifiAttempts % 10 == 0) {
      Serial.flush();
      yield(); // Ceder control para evitar watchdog
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("✅ WiFi conectado!");
    Serial.printf("📍 IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.flush();
    wifiConnected = true;
  } else {
    Serial.println();
    Serial.println("❌ Error conectando WiFi - continuará sin conexión");
    Serial.flush();
    wifiConnected = false;
  }

  // Configurar WebSocket solo si WiFi está conectado
  if (wifiConnected) {
    Serial.print("Configurando WebSocket SSL... ");
    Serial.flush();
    
    // Configuración específica para Railway
    ws.beginSSL(ws_host, ws_port, ws_path);
    ws.onEvent(webSocketEvent);
    ws.setReconnectInterval(5000);
    ws.enableHeartbeat(15000, 3000, 2); // Heartbeat cada 15s
    
    // Headers adicionales para Railway
    ws.setExtraHeaders("Origin: https://pet-tracker-production.up.railway.app");
    
    Serial.println("OK");
    
    // Intentar conexión inmediata
    Serial.print("Conectando WebSocket... ");
    Serial.flush();
    
    unsigned long wsStart = millis();
    while (!wsConnected && (millis() - wsStart < 10000)) { // 10 segundos máximo
      ws.loop();
      delay(100);
    }
    
    if (wsConnected) {
      Serial.println("✅ WebSocket conectado!");
    } else {
      Serial.println("⚠️ WebSocket no conectó (continuará intentando)");
    }
  }
  
  Serial.println("=== SISTEMA INICIADO ===");
  Serial.println("📊 Estado inicial:");
  Serial.printf("   WiFi: %s\n", wifiConnected ? "✅ Conectado" : "❌ Desconectado");
  Serial.printf("   IMU:  %s\n", mpuInitialized ? "✅ Funcionando" : "❌ Error");
  Serial.printf("   GPS:  %s\n", gpsInitialized ? (gpsReady ? "✅ Listo" : "🔍 Buscando señal...") : "❌ Deshabilitado");
  Serial.flush();
}

void loop() {
  // Mantener conexión WebSocket activa
  if (wifiConnected) {
    ws.loop();
  }
  
  // Procesar datos GPS con manejo de errores
  try {
    while (SerialGPS.available() > 0) {
      char c = SerialGPS.read();
      if (gps.encode(c)) {
        // GPS ha recibido una nueva sentencia completa válida
        if (gps.location.isUpdated()) {
          Serial.printf("📍 GPS actualizado: %.6f, %.6f\n", 
                       gps.location.lat(), gps.location.lng());
        }
      }
    }
  } catch (...) {
    // Ignorar errores de GPS para evitar colgado
    Serial.println("⚠️ Error leyendo GPS - continuando...");
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
  
  // Pequeño delay para evitar saturar el CPU
  delay(10);
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
    
    // Marcar GPS como listo si es la primera vez que obtenemos una ubicación válida
    if (!gpsReady) {
      gpsReady = true;
      Serial.println("🛰️ GPS LISTO: Señal adquirida!");
    }
    
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
    // GPS no válido - mostrar estado de búsqueda solo si está inicializado
    if (gpsInitialized) {
      static unsigned long lastSearchMessage = 0;
      if (millis() - lastSearchMessage > 10000) { // Cada 10 segundos
        Serial.printf("🔍 GPS: Buscando señal... (sats: %d)\n", gps.satellites.value());
        lastSearchMessage = millis();
      }
    }
    
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
  
  // Verificar WiFi primero
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("🔄 Reintentando conexión WiFi...");
    WiFi.begin(ssid, password);
    wifiConnected = false;
    wsConnected = false; // Si no hay WiFi, no hay WebSocket
    return;
  } else {
    wifiConnected = true;
  }
  
  // Verificar WebSocket
  if (!wsConnected) {
    Serial.println("🔄 Reintentando conexión WebSocket...");
    ws.disconnect();
    delay(1000);
    ws.beginSSL(ws_host, ws_port, ws_path);
    ws.setExtraHeaders("Origin: https://pet-tracker-production.up.railway.app");
  }
}