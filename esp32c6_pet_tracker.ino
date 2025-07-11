#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SoftwareSerial.h>
#include <Wire.h>
#include <MPU6050.h>

// Configuración WiFi
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";

// Configuración Soketi
const char* soketi_host = "soketi-production-a060.up.railway.app";
const int soketi_port = 443;
const char* app_id = "2MkkLyzX";
const char* app_key = "wigli6jxrshlpmocqtm9ywevffhq21e4";
const char* app_secret = "0s5eqev9spsgpd3zgzjrpw6rs08rrwv1";
const char* channel_name = "pet-tracker";

// Configuración GPS (NEO-6M)
SoftwareSerial gpsSerial(4, 5); // RX, TX pins
String gpsData = "";
bool gpsDataReady = false;

// Configuración MPU6050
MPU6050 mpu;
int16_t ax, ay, az;
int16_t gx, gy, gz;

// Variables para análisis de actividad
float accelMagnitude = 0;
float previousAccelMagnitude = 0;
float activityThreshold = 1.5; // Threshold para detectar movimiento
unsigned long lastActivityTime = 0;
String currentActivityState = "unknown";

// Variables de tiempo
unsigned long lastLocationSend = 0;
unsigned long lastIMUSend = 0;
unsigned long lastStatusSend = 0;
const unsigned long LOCATION_INTERVAL = 5000; // 5 segundos
const unsigned long IMU_INTERVAL = 2000; // 2 segundos
const unsigned long STATUS_INTERVAL = 30000; // 30 segundos

// ID único de la mascota
String petId = "pet-001";

// Variables de estado
bool wifiConnected = false;
int batteryLevel = 85; // Simulado
int signalStrength = 75; // Simulado

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600);
  
  // Inicializar I2C y MPU6050
  Wire.begin();
  mpu.initialize();
  
  // Verificar conexión MPU6050
  if (mpu.testConnection()) {
    Serial.println("MPU6050 conectado correctamente");
  } else {
    Serial.println("Error: MPU6050 no conectado");
  }
  
  // Conectar a WiFi
  connectToWiFi();
  
  Serial.println("Sistema iniciado - Pet Tracker ESP32C6");
  Serial.println("Configuración:");
  Serial.println("- GPS: NEO-6M en pines 4(RX), 5(TX)");
  Serial.println("- IMU: MPU6050 en I2C");
  Serial.println("- Comunicación: Soketi WebSocket");
}

void loop() {
  // Verificar conexión WiFi
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    connectToWiFi();
    return;
  } else {
    wifiConnected = true;
  }
  
  // Leer datos GPS
  readGPSData();
  
  // Leer datos IMU
  readIMUData();
  
  // Analizar actividad
  analyzeActivity();
  
  // Enviar datos según intervalos
  unsigned long currentTime = millis();
  
  // Enviar ubicación GPS
  if (currentTime - lastLocationSend >= LOCATION_INTERVAL && gpsDataReady) {
    sendLocationData();
    lastLocationSend = currentTime;
  }
  
  // Enviar datos IMU
  if (currentTime - lastIMUSend >= IMU_INTERVAL) {
    sendIMUData();
    lastIMUSend = currentTime;
  }
  
  // Enviar estado del dispositivo
  if (currentTime - lastStatusSend >= STATUS_INTERVAL) {
    sendStatusData();
    lastStatusSend = currentTime;
  }
  
  delay(100); // Pequeña pausa para no saturar
}

void connectToWiFi() {
  Serial.print("Conectando a WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi conectado!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    signalStrength = WiFi.RSSI();
  } else {
    Serial.println();
    Serial.println("Error: No se pudo conectar a WiFi");
  }
}

void readGPSData() {
  while (gpsSerial.available()) {
    char c = gpsSerial.read();
    gpsData += c;
    
    if (c == '\n') {
      // Procesar línea NMEA completa
      if (gpsData.startsWith("$GPGGA") || gpsData.startsWith("$GNGGA")) {
        parseGPSData(gpsData);
      }
      gpsData = "";
    }
  }
}

struct GPSData {
  float latitude;
  float longitude;
  float altitude;
  int satellites;
  float hdop;
  bool valid;
};

GPSData currentGPS = {0, 0, 0, 0, 0, false};

void parseGPSData(String nmea) {
  // Parser simple para GPGGA
  // Formato: $GPGGA,time,lat,N/S,lon,E/W,quality,sats,hdop,alt,M,geoid,M,dgps_time,dgps_id*checksum
  
  int commaIndex[15];
  int commaCount = 0;
  
  // Encontrar todas las comas
  for (int i = 0; i < nmea.length() && commaCount < 15; i++) {
    if (nmea.charAt(i) == ',') {
      commaIndex[commaCount] = i;
      commaCount++;
    }
  }
  
  if (commaCount < 14) return; // NMEA inválida
  
  // Extraer calidad de fix
  String quality = nmea.substring(commaIndex[5] + 1, commaIndex[6]);
  if (quality == "0") {
    currentGPS.valid = false;
    return; // Sin fix GPS
  }
  
  // Extraer latitud
  String latStr = nmea.substring(commaIndex[1] + 1, commaIndex[2]);
  String latDir = nmea.substring(commaIndex[2] + 1, commaIndex[3]);
  
  // Extraer longitud
  String lonStr = nmea.substring(commaIndex[3] + 1, commaIndex[4]);
  String lonDir = nmea.substring(commaIndex[4] + 1, commaIndex[5]);
  
  // Extraer otros datos
  String satStr = nmea.substring(commaIndex[6] + 1, commaIndex[7]);
  String hdopStr = nmea.substring(commaIndex[7] + 1, commaIndex[8]);
  String altStr = nmea.substring(commaIndex[8] + 1, commaIndex[9]);
  
  if (latStr.length() > 0 && lonStr.length() > 0) {
    // Convertir formato DDMM.MMMM a decimal
    currentGPS.latitude = convertDMSToDecimal(latStr, latDir);
    currentGPS.longitude = convertDMSToDecimal(lonStr, lonDir);
    currentGPS.satellites = satStr.toInt();
    currentGPS.hdop = hdopStr.toFloat();
    currentGPS.altitude = altStr.toFloat();
    currentGPS.valid = true;
    gpsDataReady = true;
    
    Serial.println("GPS Fix obtenido:");
    Serial.printf("Lat: %.6f, Lon: %.6f\n", currentGPS.latitude, currentGPS.longitude);
    Serial.printf("Sats: %d, HDOP: %.2f, Alt: %.1fm\n", 
                  currentGPS.satellites, currentGPS.hdop, currentGPS.altitude);
  }
}

float convertDMSToDecimal(String dms, String direction) {
  if (dms.length() < 4) return 0;
  
  float degrees = dms.substring(0, dms.length() - 7).toFloat();
  float minutes = dms.substring(dms.length() - 7).toFloat();
  
  float decimal = degrees + (minutes / 60.0);
  
  if (direction == "S" || direction == "W") {
    decimal = -decimal;
  }
  
  return decimal;
}

void readIMUData() {
  // Leer datos del acelerómetro y giroscopio
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  
  // Convertir a unidades g y grados/segundo
  float accelX = ax / 16384.0; // Para rango ±2g
  float accelY = ay / 16384.0;
  float accelZ = az / 16384.0;
  
  float gyroX = gx / 131.0; // Para rango ±250°/s
  float gyroY = gy / 131.0;
  float gyroZ = gz / 131.0;
  
  // Calcular magnitud de aceleración total
  previousAccelMagnitude = accelMagnitude;
  accelMagnitude = sqrt(accelX*accelX + accelY*accelY + accelZ*accelZ);
  
  // Debug IMU
  if (millis() % 5000 < 100) { // Imprimir cada 5 segundos
    Serial.printf("IMU - Accel: X=%.2f Y=%.2f Z=%.2f (mag=%.2f)\n", 
                  accelX, accelY, accelZ, accelMagnitude);
    Serial.printf("      Gyro:  X=%.2f Y=%.2f Z=%.2f\n", gyroX, gyroY, gyroZ);
  }
}

void analyzeActivity() {
  // Análisis simple de actividad basado en acelerómetro
  float accelVariation = abs(accelMagnitude - previousAccelMagnitude);
  unsigned long currentTime = millis();
  
  // TODO: Aquí puedes implementar tu algoritmo personalizado de análisis de actividad
  // Por ahora, implementación básica:
  
  if (accelVariation > activityThreshold) {
    lastActivityTime = currentTime;
  }
  
  // Determinar estado de actividad
  unsigned long timeSinceActivity = currentTime - lastActivityTime;
  
  if (timeSinceActivity < 2000) {
    // Movimiento reciente
    if (accelVariation > 3.0) {
      currentActivityState = "running";
    } else if (accelVariation > 1.5) {
      currentActivityState = "walking";
    } else {
      currentActivityState = "standing";
    }
  } else {
    // Sin movimiento por un tiempo
    currentActivityState = "lying";
  }
  
  // Análisis adicional basado en orientación
  // TODO: Implementar análisis más sofisticado usando orientación del dispositivo
  // Ejemplo: detectar si está boca arriba, de lado, etc.
  
  /* ESPACIO PARA TU CÓDIGO PERSONALIZADO DE ANÁLISIS DE ACTIVIDAD
   * 
   * Aquí puedes implementar algoritmos más avanzados:
   * 
   * 1. Análisis de patrones de movimiento
   * 2. Detección de orientación (echado vs parado)
   * 3. Machine Learning para clasificación de actividades
   * 4. Filtros para suavizar las transiciones
   * 
   * Ejemplo de estructura:
   * 
   * float roll = atan2(accelY, accelZ) * 180 / PI;
   * float pitch = atan2(-accelX, sqrt(accelY*accelY + accelZ*accelZ)) * 180 / PI;
   * 
   * if (abs(roll) > 45 || abs(pitch) > 45) {
   *     currentActivityState = "lying";
   * } else if (accelVariation < 0.5) {
   *     currentActivityState = "standing";
   * }
   */
}

void sendLocationData() {
  if (!currentGPS.valid) {
    Serial.println("GPS no válido, no enviando ubicación");
    return;
  }
  
  // Crear JSON con datos de ubicación
  DynamicJsonDocument doc(512);
  doc["event"] = "location-update";
  doc["channel"] = channel_name;
  
  JsonObject data = doc.createNestedObject("data");
  data["petId"] = petId;
  data["latitude"] = currentGPS.latitude;
  data["longitude"] = currentGPS.longitude;
  data["timestamp"] = millis();
  data["accuracy"] = currentGPS.hdop * 5; // Estimación de precisión
  data["speed"] = 0; // TODO: Calcular velocidad
  data["altitude"] = currentGPS.altitude;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  sendToSoketi(jsonString);
  Serial.println("Ubicación enviada: " + String(currentGPS.latitude, 6) + ", " + String(currentGPS.longitude, 6));
}

void sendIMUData() {
  // Crear JSON con datos IMU
  DynamicJsonDocument doc(512);
  doc["event"] = "imu-update";
  doc["channel"] = channel_name;
  
  JsonObject data = doc.createNestedObject("data");
  data["petId"] = petId;
  data["accelX"] = ax / 16384.0;
  data["accelY"] = ay / 16384.0;
  data["accelZ"] = az / 16384.0;
  data["gyroX"] = gx / 131.0;
  data["gyroY"] = gy / 131.0;
  data["gyroZ"] = gz / 131.0;
  data["timestamp"] = millis();
  data["activityState"] = currentActivityState;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  sendToSoketi(jsonString);
  Serial.println("IMU enviado - Estado: " + currentActivityState);
}

void sendStatusData() {
  // Simular lecturas de batería y señal
  batteryLevel = max(20, batteryLevel - random(0, 3)); // Simular descarga
  signalStrength = WiFi.RSSI();
  
  // Crear JSON con datos de estado
  DynamicJsonDocument doc(512);
  doc["event"] = "status-update";
  doc["channel"] = channel_name;
  
  JsonObject data = doc.createNestedObject("data");
  data["petId"] = petId;
  data["status"] = wifiConnected ? "online" : "offline";
  data["batteryLevel"] = batteryLevel;
  data["signalStrength"] = map(signalStrength, -100, -30, 0, 100);
  data["timestamp"] = millis();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  sendToSoketi(jsonString);
  Serial.println("Estado enviado - Batería: " + String(batteryLevel) + "%, Señal: " + String(signalStrength) + "dBm");
}

void sendToSoketi(String jsonData) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi no conectado, no se puede enviar datos");
    return;
  }
  
  HTTPClient http;
  http.begin("https://" + String(soketi_host) + "/apps/" + String(app_id) + "/events");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + String(app_key));
  
  Serial.println("Enviando a Soketi: " + jsonData);
  
  int httpResponseCode = http.POST(jsonData);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Respuesta Soketi (" + String(httpResponseCode) + "): " + response);
  } else {
    Serial.println("Error enviando a Soketi: " + String(httpResponseCode));
  }
  
  http.end();
}
