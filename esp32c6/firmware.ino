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

// Variables para análisis de actividad optimizado para sensor en la espalda
float previousLat = 0.0;
float previousLng = 0.0;
unsigned long lastGPSTime = 0;
float currentSpeed = 0.0; // Velocidad en m/s
float averageAccelMagnitude = 0.0;
float averageGyroMagnitude = 0.0;
int activitySamples = 0;
const int MAX_ACTIVITY_SAMPLES = 10; // Más muestras para mejor precisión

// Buffers para análisis avanzado de patrones de movimiento
float accelBuffer[MAX_ACTIVITY_SAMPLES];
float gyroBuffer[MAX_ACTIVITY_SAMPLES];
int bufferIndex = 0;

// Umbrales calibrados para sensor en la espalda de mascota
struct ActivityThresholds {
  float lying_accel = 9.2;      // Acostado - mínimo movimiento
  float lying_gyro = 0.5;
  float sitting_accel = 10.5;   // Sentado - movimiento mínimo
  float sitting_gyro = 1.2;
  float standing_accel = 11.8;  // Parado - movimientos leves
  float standing_gyro = 2.0;
  float walking_accel = 13.5;   // Caminando - patrón rítmico
  float walking_gyro = 3.5;
  float running_accel = 16.0;   // Corriendo - alta actividad
  float running_gyro = 5.5;
  float playing_accel = 18.0;   // Jugando - movimientos erráticos
  float playing_gyro = 7.0;
} thresholds;

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
    
    // Calcular magnitud total del acelerómetro y giroscopio
    imuMagnitude = sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);
    float gyroMagnitude = sqrt(gyroX * gyroX + gyroY * gyroY + gyroZ * gyroZ);
    
    // Actualizar buffers circulares para análisis de patrones
    accelBuffer[bufferIndex] = imuMagnitude;
    gyroBuffer[bufferIndex] = gyroMagnitude;
    bufferIndex = (bufferIndex + 1) % MAX_ACTIVITY_SAMPLES;
    
    // Actualizar promedios móviles
    float totalAccel = 0, totalGyro = 0;
    int validSamples = min(activitySamples + 1, MAX_ACTIVITY_SAMPLES);
    
    for (int i = 0; i < validSamples; i++) {
      totalAccel += accelBuffer[i];
      totalGyro += gyroBuffer[i];
    }
    
    averageAccelMagnitude = totalAccel / validSamples;
    averageGyroMagnitude = totalGyro / validSamples;
    
    if (activitySamples < MAX_ACTIVITY_SAMPLES) {
      activitySamples++;
    }
    
    // Análisis avanzado de actividad para sensor en la espalda
    activity = analyzeBackpackActivity(averageAccelMagnitude, averageGyroMagnitude, currentSpeed, gpsValid, accelX, accelY, accelZ);
    
    // Debug logging detallado con timestamp
    unsigned long currentTime = millis();
    Serial.println("==================================================");
    Serial.printf("🕒 TIMESTAMP: %lu ms (%lu seg)\n", currentTime, currentTime/1000);
    Serial.printf("🎯 ACTIVIDAD DETECTADA: %s\n", activity.c_str());
    Serial.printf("📊 MÉTRICAS DETALLADAS:\n");
    Serial.printf("   - Acelerómetro promedio: %.2f m/s²\n", averageAccelMagnitude);
    Serial.printf("   - Giroscopio promedio: %.2f rad/s\n", averageGyroMagnitude);
    Serial.printf("   - Velocidad GPS: %.2f m/s (%.2f km/h)\n", currentSpeed, currentSpeed * 3.6);
    Serial.printf("   - Componente Z: %.2f m/s²\n", accelZ);
    Serial.printf("   - GPS válido: %s\n", gpsValid ? "SÍ" : "NO");
    Serial.println("==================================================");
  } else {
    // Sin IMU, usar solo GPS para determinar actividad básica
    activity = analyzeGPSOnlyActivity(currentSpeed, gpsValid);
    
    // Si tampoco hay GPS válido, usar actividad por defecto
    if (activity == "unknown") {
      activity = "resting"; // Por defecto descansando
      Serial.println("⚠️ Sin IMU ni GPS válido, usando actividad por defecto: resting");
    }
  }

  // CRÍTICO: Agregar datos IMU al JSON (SIEMPRE, incluso si IMU falla)
  // El backend REQUIERE estos campos para validación
  JsonObject accel = jsonDoc.createNestedObject("accelerometer");
  accel["x"] = accelX;  // Si IMU falla, estos serán 0.0
  accel["y"] = accelY;
  accel["z"] = accelZ;

  JsonObject gyro = jsonDoc.createNestedObject("gyroscope");
  gyro["x"] = gyroX;
  gyro["y"] = gyroY;
  gyro["z"] = gyroZ;

  // Agregar datos procesados y optimizados para la web
  jsonDoc["temperature"] = tempC;
  jsonDoc["activity"] = activity;
  jsonDoc["activity_confidence"] = calculateActivityConfidence(activity, averageAccelMagnitude, averageGyroMagnitude, gpsValid);
  jsonDoc["movement_intensity"] = calculateMovementIntensity(averageAccelMagnitude, averageGyroMagnitude);
  jsonDoc["posture"] = analyzePosture(accelX, accelY, accelZ);
  jsonDoc["imu_magnitude"] = imuMagnitude;
  jsonDoc["imu_average"] = averageAccelMagnitude;
  jsonDoc["gyro_average"] = averageGyroMagnitude;
  
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
  
  // Print detallado antes de enviar
  Serial.println("📤 ENVIANDO DATOS AL BACKEND:");
  Serial.printf("   🏷️  Device ID: %s\n", jsonDoc["deviceId"].as<String>().c_str());
  Serial.printf("   🎭 Actividad: %s\n", jsonDoc["activity"].as<String>().c_str());
  Serial.printf("   � Confianza: %.1f%%\n", jsonDoc["activity_confidence"].as<float>() * 100);
  Serial.printf("   💪 Intensidad: %d%%\n", jsonDoc["movement_intensity"].as<int>());
  Serial.printf("   🧍 Postura: %s\n", jsonDoc["posture"].as<String>().c_str());
  Serial.printf("   📍 GPS: %s\n", jsonDoc["gps_valid"].as<bool>() ? "VÁLIDO" : "INVÁLIDO");
  if (jsonDoc["gps_valid"].as<bool>()) {
    Serial.printf("   🌍 Coordenadas: %.6f, %.6f\n", 
                  jsonDoc["latitude"].as<float>(), jsonDoc["longitude"].as<float>());
  }
  Serial.printf("   📡 JSON completo: %s\n", jsonString.c_str());
  Serial.println("==========================================");
  
  if (ws.sendTXT(jsonString)) {
    Serial.println("✅ DATOS ENVIADOS EXITOSAMENTE AL BACKEND");
  } else {
    Serial.println("❌ ERROR ENVIANDO DATOS - WEBSOCKET DESCONECTADO");
    wsConnected = false;
  }
}

// Función optimizada para análisis de actividad con sensor en la espalda de la mascota
String analyzeBackpackActivity(float accelMag, float gyroMag, float speed, bool gpsValid, float accelX, float accelY, float accelZ) {
  float speedKmh = speed * 3.6;
  
  // Analizar orientación del sensor (importante para sensor en la espalda)
  float verticalComponent = abs(accelZ); // Componente vertical del acelerómetro
  float horizontalMag = sqrt(accelX * accelX + accelY * accelY);
  
  Serial.printf("🔍 Análisis Espalda: Accel=%.2f, Gyro=%.2f, Speed=%.2f km/h, Vertical=%.2f\n", 
                accelMag, gyroMag, speedKmh, verticalComponent);
  
  // Prioridad 1: Velocidad GPS muy alta (en transporte/vehículo)
  if (gpsValid && speedKmh > 20.0) {
    return "traveling";
  }
  
  // Prioridad 2: Análisis combinado de patrones de movimiento
  
  // Jugando - Movimientos erráticos e intensos (alta variabilidad)
  if (accelMag > thresholds.playing_accel && gyroMag > thresholds.playing_gyro) {
    if (speedKmh >= 3.0 && speedKmh <= 15.0) { // Velocidad moderada con alta actividad
      return "playing";
    }
  }
  
  // Corriendo - Alta actividad con patrón rítmico
  if (accelMag > thresholds.running_accel && gyroMag > thresholds.running_gyro) {
    if (gpsValid && speedKmh >= 8.0 && speedKmh <= 25.0) {
      return "running";
    }
    // Sin GPS pero con actividad intensa
    if (!gpsValid && accelMag > 17.0) {
      return "running";
    }
  }
  
  // Caminando - Actividad moderada con movimiento hacia adelante
  if (accelMag > thresholds.walking_accel && gyroMag > thresholds.walking_gyro) {
    if (gpsValid && speedKmh >= 1.5 && speedKmh < 8.0) {
      return "walking";
    }
    // Sin GPS pero con patrón de caminata
    if (!gpsValid && accelMag > 12.0 && accelMag <= 16.0) {
      return "walking";
    }
  }
  
  // Parado - Movimientos mínimos pero no completamente quieto
  if (accelMag > thresholds.standing_accel && accelMag <= thresholds.walking_accel) {
    if (gyroMag > thresholds.standing_gyro && gyroMag <= thresholds.walking_gyro) {
      // Verificar si hay pequeños movimientos de cabeza/cuerpo
      if (verticalComponent > 8.0 && verticalComponent < 12.0) {
        return "standing";
      }
    }
  }
  
  // Sentado - Posición estable con orientación específica
  if (accelMag > thresholds.sitting_accel && accelMag <= thresholds.standing_accel) {
    if (gyroMag <= thresholds.sitting_gyro) {
      // El sensor en la espalda detecta cuando está sentado por la inclinación
      if (verticalComponent < 8.0 && horizontalMag > 6.0) {
        return "sitting";
      }
    }
  }
  
  // Acostado/Durmiendo - Actividad mínima
  if (accelMag <= thresholds.lying_accel && gyroMag <= thresholds.lying_gyro) {
    if (speedKmh < 1.0) {
      return "lying";
    }
  }
  
  // Casos por defecto basados en actividad general
  if (speedKmh < 1.0 && accelMag < 12.0) {
    return "resting";
  } else if (accelMag > 15.0) {
    return "active";
  } else {
    return "standing";
  }
}

// Función para calcular confianza en la actividad detectada
float calculateActivityConfidence(String activity, float accelMag, float gyroMag, bool gpsValid) {
  float confidence = 0.5; // Confianza base
  
  // Ajustar confianza basada en la calidad de los datos
  if (gpsValid) {
    confidence += 0.2; // GPS válido aumenta confianza
  }
  
  // Ajustar según la actividad detectada
  if (activity == "lying" && accelMag < 10.0 && gyroMag < 1.0) {
    confidence = 0.95; // Muy seguro cuando está quieto
  } else if (activity == "running" && accelMag > 16.0 && gyroMag > 5.0) {
    confidence = 0.90; // Muy seguro cuando corre
  } else if (activity == "walking" && accelMag > 12.0 && accelMag < 16.0) {
    confidence = 0.85; // Bastante seguro caminando
  } else if (activity == "playing" && accelMag > 18.0) {
    confidence = 0.80; // Seguro jugando con alta actividad
  }
  
  return min(0.99f, max(0.30f, confidence)); // Limitar entre 30% y 99%
}

// Función para calcular intensidad de movimiento (0-100%)
int calculateMovementIntensity(float accelMag, float gyroMag) {
  // Normalizar la intensidad basada en rangos típicos
  float accelIntensity = min(100.0f, (accelMag - 9.0f) * 5.0f); // 9G base, escalar
  float gyroIntensity = min(100.0f, gyroMag * 15.0f); // Escalar giroscopio
  
  int intensity = (int)((accelIntensity + gyroIntensity) / 2.0f);
  return max(0, min(100, intensity));
}

// Función para analizar postura basada en orientación del sensor
String analyzePosture(float accelX, float accelY, float accelZ) {
  float totalMag = sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);
  
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

// Función mejorada para análisis basado solo en GPS (cuando IMU no está disponible)
String analyzeGPSOnlyActivity(float speed, bool gpsValid) {
  if (!gpsValid) {
    return "resting"; // Sin GPS válido, asumir descansando
  }
  
  float speedKmh = speed * 3.6;
  
  // Análisis más detallado basado en velocidad GPS
  if (speedKmh > 25.0) {
    return "traveling"; // En vehículo
  } else if (speedKmh >= 12.0) {
    return "running"; // Corriendo rápido
  } else if (speedKmh >= 4.0) {
    return "walking"; // Caminando o trotando
  } else if (speedKmh >= 1.0) {
    return "standing"; // Movimiento muy lento, probablemente parado con pequeños movimientos
  } else {
    return "resting"; // Sin movimiento significativo
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