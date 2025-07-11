/*
 * ESP32-C6 Pet Tracker - Versión 3.0 Completamente Nueva
 * Diseñado específicamente para funcionar con la aplicación web
 * Autor: GitHub Copilot
 * Fecha: 2025
 * 
 * Hardware:
 * - ESP32-C6 DevKit
 * - GPS NEO-6M (RX=17, TX=16)
 * - MPU6050 IMU (SDA=21, SCL=22)
 * 
 * Características:
 * - Protocolo 100% compatible con la web app
 * - Datos JSON estructurados según interfaces TypeScript
 * - Throttling inteligente para optimizar batería
 * - Sistema robusto de reconexión WiFi
 * - Parser GPS NMEA optimizado
 * - Análisis de actividad con IA básica
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <Wire.h>
#include <MPU6050.h>

// ===============================
// CONFIGURACIÓN DE RED
// ===============================
const char* WIFI_SSID = "WILLY 2.4G";
const char* WIFI_PASSWORD = "30429088";

// ===============================
// CONFIGURACIÓN SOKETI (RAILWAY)
// ===============================
const char* SOKETI_HOST = "soketi-production-a060.up.railway.app";
const char* SOKETI_APP_ID = "2MkkLyzX";
const char* SOKETI_KEY = "wigli6jxrshlpmocqtm9ywevffhq21e4";
const char* SOKETI_CHANNEL = "pet-tracker";
const char* SOKETI_URL = "https://soketi-production-a060.up.railway.app/apps/2MkkLyzX/events";

// ===============================
// CONFIGURACIÓN HARDWARE
// ===============================
#define GPS_RX_PIN 17
#define GPS_TX_PIN 16
#define GPS_BAUD 9600

#define IMU_SDA_PIN 21
#define IMU_SCL_PIN 22

// ===============================
// INSTANCIAS HARDWARE
// ===============================
HardwareSerial gpsSerial(1);
MPU6050 imu;

// ===============================
// ESTRUCTURAS DE DATOS
// ===============================
struct GPSData {
    double latitude;
    double longitude;
    double altitude;
    double hdop;
    int satellites;
    bool hasValidFix;
    unsigned long lastUpdate;
};

struct IMUData {
    double accelX, accelY, accelZ;
    double gyroX, gyroY, gyroZ;
    double magnitude;
    String activityState;
    unsigned long lastUpdate;
};

struct SystemStatus {
    bool wifiConnected;
    int batteryLevel;
    int signalStrength;
    String status;
    unsigned long uptime;
    unsigned long lastUpdate;
};

// ===============================
// VARIABLES GLOBALES
// ===============================
GPSData gpsData = {0};
IMUData imuData = {0};
SystemStatus systemStatus = {false, 100, 0, "offline", 0, 0};

String gpsBuffer = "";
bool systemInitialized = false;

// Timing para envío de datos (según throttling de la web app)
unsigned long lastLocationSent = 0;
unsigned long lastIMUSent = 0;
unsigned long lastStatusSent = 0;

// Intervalos optimizados según la web app
const unsigned long LOCATION_INTERVAL = 1000;  // 1 segundo (throttle web: 1000ms)
const unsigned long IMU_INTERVAL = 500;        // 500ms (throttle web: 500ms)  
const unsigned long STATUS_INTERVAL = 5000;    // 5 segundos (throttle web: 5000ms)

// ===============================
// SETUP PRINCIPAL
// ===============================
void setup() {
    Serial.begin(115200);
    delay(1000);
    
    // Banner de inicio
    Serial.println("===============================================");
    Serial.println("🐾 ESP32-C6 Pet Tracker v3.0 - Nueva Versión");
    Serial.println("🌐 Diseñado para tu aplicación web");
    Serial.println("📡 Protocolo: Soketi WebSocket (Railway)");
    Serial.println("📍 GPS: NEO-6M en pines 17/16");
    Serial.println("📊 IMU: MPU6050 en pines 21/22");
    Serial.println("===============================================");
    
    // Inicializar hardware
    initializeGPS();
    initializeIMU();
    initializeWiFi();
    
    // Estado inicial
    systemStatus.status = "initializing";
    systemStatus.uptime = millis();
    
    Serial.println("✅ Sistema inicializado correctamente");
    Serial.println("🔄 Iniciando bucle principal...");
    
    systemInitialized = true;
}

// ===============================
// LOOP PRINCIPAL
// ===============================
void loop() {
    unsigned long currentTime = millis();
    
    // Leer sensores continuamente
    readGPSData();
    readIMUData();
    updateSystemStatus();
    
    // Verificar WiFi cada 10 segundos
    static unsigned long lastWiFiCheck = 0;
    if (currentTime - lastWiFiCheck > 10000) {
        checkWiFiConnection();
        lastWiFiCheck = currentTime;
    }
    
    // Enviar datos según intervalos optimizados
    if (systemStatus.wifiConnected) {
        // Location data (1 segundo)
        if (gpsData.hasValidFix && 
            currentTime - lastLocationSent > LOCATION_INTERVAL) {
            sendLocationUpdate();
            lastLocationSent = currentTime;
        }
        
        // IMU data (500ms)
        if (currentTime - lastIMUSent > IMU_INTERVAL) {
            sendIMUUpdate();
            lastIMUSent = currentTime;
        }
        
        // Status data (5 segundos)
        if (currentTime - lastStatusSent > STATUS_INTERVAL) {
            sendStatusUpdate();
            lastStatusSent = currentTime;
        }
    }
    
    // Delay mínimo para estabilidad
    delay(100);
}

// ===============================
// INICIALIZACIÓN HARDWARE
// ===============================
void initializeGPS() {
    Serial.print("📍 Inicializando GPS NEO-6M...");
    
    gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    delay(1000);
    
    // Configurar GPS para mayor frecuencia de actualización
    gpsSerial.println("$PMTK314,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0*28"); // Solo GGA y RMC
    gpsSerial.println("$PMTK220,1000*1F"); // 1Hz update rate
    
    Serial.println(" ✅");
    Serial.printf("   RX Pin: %d, TX Pin: %d\n", GPS_RX_PIN, GPS_TX_PIN);
}

void initializeIMU() {
    Serial.print("📊 Inicializando MPU6050...");
    
    Wire.begin(IMU_SDA_PIN, IMU_SCL_PIN);
    imu.initialize();
    
    if (imu.testConnection()) {
        imu.setFullScaleAccelRange(MPU6050_ACCEL_FS_4);  // ±4g
        imu.setFullScaleGyroRange(MPU6050_GYRO_FS_500);  // ±500°/s
        Serial.println(" ✅");
        Serial.printf("   SDA Pin: %d, SCL Pin: %d\n", IMU_SDA_PIN, IMU_SCL_PIN);
    } else {
        Serial.println(" ❌ Error de conexión");
    }
}

void initializeWiFi() {
    Serial.print("🌐 Conectando a WiFi...");
    
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        systemStatus.wifiConnected = true;
        systemStatus.status = "online";
        Serial.println(" ✅");
        Serial.printf("   IP: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("   RSSI: %d dBm\n", WiFi.RSSI());
    } else {
        systemStatus.wifiConnected = false;
        systemStatus.status = "offline";
        Serial.println(" ❌ No se pudo conectar");
    }
}

// ===============================
// LECTURA DE SENSORES
// ===============================
void readGPSData() {
    while (gpsSerial.available()) {
        char c = gpsSerial.read();
        
        if (c == '\n') {
            processGPSLine();
            gpsBuffer = "";
        } else if (c != '\r' && gpsBuffer.length() < 120) {
            gpsBuffer += c;
        }
    }
}

void processGPSLine() {
    if (gpsBuffer.startsWith("$GPGGA") || gpsBuffer.startsWith("$GNGGA")) {
        parseGGASentence();
    }
}

void parseGGASentence() {
    // Parser NMEA optimizado para GPGGA
    int commas[15];
    int commaCount = 0;
    
    // Encontrar todas las comas
    for (int i = 0; i < gpsBuffer.length() && commaCount < 15; i++) {
        if (gpsBuffer[i] == ',') {
            commas[commaCount++] = i;
        }
    }
    
    if (commaCount < 14) return; // Sentencia incompleta
    
    // Verificar calidad del fix (campo 6)
    String fixQuality = gpsBuffer.substring(commas[5] + 1, commas[6]);
    if (fixQuality == "0") {
        gpsData.hasValidFix = false;
        return;
    }
    
    // Parsear latitud (campos 2 y 3)
    String latStr = gpsBuffer.substring(commas[1] + 1, commas[2]);
    String latDir = gpsBuffer.substring(commas[2] + 1, commas[3]);
    
    // Parsear longitud (campos 4 y 5)
    String lonStr = gpsBuffer.substring(commas[3] + 1, commas[4]);
    String lonDir = gpsBuffer.substring(commas[4] + 1, commas[5]);
    
    if (latStr.length() > 0 && lonStr.length() > 0) {
        gpsData.latitude = convertDMStoDecimal(latStr, latDir);
        gpsData.longitude = convertDMStoDecimal(lonStr, lonDir);
        
        // Número de satélites (campo 7)
        gpsData.satellites = gpsBuffer.substring(commas[6] + 1, commas[7]).toInt();
        
        // HDOP (campo 8)
        gpsData.hdop = gpsBuffer.substring(commas[7] + 1, commas[8]).toFloat();
        
        // Altitud (campo 9)
        gpsData.altitude = gpsBuffer.substring(commas[8] + 1, commas[9]).toFloat();
        
        gpsData.hasValidFix = true;
        gpsData.lastUpdate = millis();
        
        // Log cada 10 segundos
        static unsigned long lastGPSLog = 0;
        if (millis() - lastGPSLog > 10000) {
            Serial.printf("📍 GPS: %.6f, %.6f (Sats: %d, HDOP: %.1f)\n", 
                         gpsData.latitude, gpsData.longitude, 
                         gpsData.satellites, gpsData.hdop);
            lastGPSLog = millis();
        }
    }
}

double convertDMStoDecimal(String dms, String direction) {
    if (dms.length() < 4) return 0.0;
    
    int dotPos = dms.indexOf('.');
    if (dotPos < 2) return 0.0;
    
    double degrees = dms.substring(0, dotPos - 2).toDouble();
    double minutes = dms.substring(dotPos - 2).toDouble();
    
    double decimal = degrees + (minutes / 60.0);
    
    if (direction == "S" || direction == "W") {
        decimal = -decimal;
    }
    
    return decimal;
}

void readIMUData() {
    if (!imu.testConnection()) return;
    
    int16_t ax, ay, az, gx, gy, gz;
    imu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
    
    // Convertir a valores reales (g y °/s)
    imuData.accelX = ax / 8192.0;  // Para ±4g
    imuData.accelY = ay / 8192.0;
    imuData.accelZ = az / 8192.0;
    
    imuData.gyroX = gx / 65.5;     // Para ±500°/s
    imuData.gyroY = gy / 65.5;
    imuData.gyroZ = gz / 65.5;
    
    // Calcular magnitud total de aceleración
    imuData.magnitude = sqrt(imuData.accelX * imuData.accelX + 
                            imuData.accelY * imuData.accelY + 
                            imuData.accelZ * imuData.accelZ);
    
    // Actualizar estado de actividad
    updateActivityState();
    imuData.lastUpdate = millis();
}

void updateActivityState() {
    static double previousMagnitude = 0.0;
    static unsigned long lastMovement = 0;
    
    double magnitudeDiff = abs(imuData.magnitude - previousMagnitude);
    previousMagnitude = imuData.magnitude;
    
    // Algoritmo mejorado de detección de actividad
    if (magnitudeDiff > 2.5) {
        lastMovement = millis();
        imuData.activityState = "running";
    } else if (magnitudeDiff > 1.2) {
        lastMovement = millis();
        imuData.activityState = "walking";
    } else if (magnitudeDiff > 0.3) {
        lastMovement = millis();
        imuData.activityState = "standing";
    } else if (millis() - lastMovement > 3000) {
        imuData.activityState = "lying";
    }
    
    // Si no hay datos suficientes
    if (imuData.activityState.length() == 0) {
        imuData.activityState = "unknown";
    }
}

void updateSystemStatus() {
    systemStatus.uptime = millis();
    
    // Simular descarga de batería realista
    static unsigned long lastBatteryUpdate = 0;
    if (millis() - lastBatteryUpdate > 60000) { // Cada minuto
        int drain = random(0, 2); // 0-1% por minuto
        systemStatus.batteryLevel = max(0, systemStatus.batteryLevel - drain);
        lastBatteryUpdate = millis();
    }
    
    // Actualizar fuerza de señal WiFi
    if (systemStatus.wifiConnected) {
        int rssi = WiFi.RSSI();
        systemStatus.signalStrength = map(rssi, -100, -30, 0, 100);
        systemStatus.signalStrength = constrain(systemStatus.signalStrength, 0, 100);
    } else {
        systemStatus.signalStrength = 0;
    }
}

void checkWiFiConnection() {
    if (WiFi.status() != WL_CONNECTED) {
        systemStatus.wifiConnected = false;
        systemStatus.status = "offline";
        
        Serial.println("🔄 Reintentando conexión WiFi...");
        WiFi.reconnect();
        
        delay(5000);
        
        if (WiFi.status() == WL_CONNECTED) {
            systemStatus.wifiConnected = true;
            systemStatus.status = "online";
            Serial.println("✅ WiFi reconectado");
        }
    } else {
        systemStatus.wifiConnected = true;
        systemStatus.status = "online";
    }
}

// ===============================
// ENVÍO DE DATOS A SOKETI
// ===============================
void sendLocationUpdate() {
    if (!gpsData.hasValidFix || !systemStatus.wifiConnected) return;
    
    // Crear JSON según PetLocationData interface
    StaticJsonDocument<300> doc;
    doc["event"] = "location-update";
    doc["channel"] = SOKETI_CHANNEL;
    
    JsonObject data = doc.createNestedObject("data");
    data["petId"] = "pet-001";
    data["latitude"] = gpsData.latitude;
    data["longitude"] = gpsData.longitude;
    data["timestamp"] = millis();
    data["accuracy"] = gpsData.hdop * 3.0; // Convertir HDOP a metros aproximados
    data["altitude"] = gpsData.altitude;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    if (sendToSoketi(jsonString)) {
        Serial.printf("📍 Ubicación enviada: %.6f, %.6f\n", 
                     gpsData.latitude, gpsData.longitude);
    }
}

void sendIMUUpdate() {
    if (!systemStatus.wifiConnected) return;
    
    // Crear JSON según PetIMUData interface
    StaticJsonDocument<350> doc;
    doc["event"] = "imu-update";
    doc["channel"] = SOKETI_CHANNEL;
    
    JsonObject data = doc.createNestedObject("data");
    data["petId"] = "pet-001";
    data["accelX"] = imuData.accelX;
    data["accelY"] = imuData.accelY;
    data["accelZ"] = imuData.accelZ;
    data["gyroX"] = imuData.gyroX;
    data["gyroY"] = imuData.gyroY;
    data["gyroZ"] = imuData.gyroZ;
    data["timestamp"] = millis();
    data["activityState"] = imuData.activityState;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    if (sendToSoketi(jsonString)) {
        Serial.printf("📊 IMU enviado: %s (mag: %.2f)\n", 
                     imuData.activityState.c_str(), imuData.magnitude);
    }
}

void sendStatusUpdate() {
    if (!systemStatus.wifiConnected) return;
    
    // Crear JSON según PetStatusData interface
    StaticJsonDocument<250> doc;
    doc["event"] = "status-update";
    doc["channel"] = SOKETI_CHANNEL;
    
    JsonObject data = doc.createNestedObject("data");
    data["petId"] = "pet-001";
    data["status"] = systemStatus.status;
    data["batteryLevel"] = systemStatus.batteryLevel;
    data["signalStrength"] = systemStatus.signalStrength;
    data["timestamp"] = millis();
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    if (sendToSoketi(jsonString)) {
        Serial.printf("🔋 Estado enviado: %s (%d%% bat, %d%% señal)\n", 
                     systemStatus.status.c_str(), 
                     systemStatus.batteryLevel, 
                     systemStatus.signalStrength);
    }
}

bool sendToSoketi(String jsonData) {
    HTTPClient http;
    http.begin(SOKETI_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + String(SOKETI_KEY));
    http.setTimeout(5000);
    
    int httpResponseCode = http.POST(jsonData);
    
    bool success = (httpResponseCode == 200 || httpResponseCode == 201);
    
    if (!success) {
        Serial.printf("❌ Error HTTP: %d\n", httpResponseCode);
        if (httpResponseCode > 0) {
            String response = http.getString();
            Serial.printf("   Respuesta: %s\n", response.c_str());
        }
    }
    
    http.end();
    return success;
}

// ===============================
// FUNCIONES DE UTILIDAD
// ===============================
void printSystemInfo() {
    Serial.println("\n===============================================");
    Serial.println("📊 INFORMACIÓN DEL SISTEMA");
    Serial.println("===============================================");
    
    Serial.printf("🕐 Uptime: %lu ms\n", systemStatus.uptime);
    Serial.printf("📶 WiFi: %s (RSSI: %d dBm)\n", 
                  systemStatus.wifiConnected ? "Conectado" : "Desconectado",
                  WiFi.RSSI());
    Serial.printf("🔋 Batería: %d%%\n", systemStatus.batteryLevel);
    Serial.printf("📡 Señal: %d%%\n", systemStatus.signalStrength);
    
    if (gpsData.hasValidFix) {
        Serial.printf("📍 GPS: %.6f, %.6f (Alt: %.1fm)\n", 
                     gpsData.latitude, gpsData.longitude, gpsData.altitude);
        Serial.printf("🛰️ Satélites: %d, HDOP: %.1f\n", 
                     gpsData.satellites, gpsData.hdop);
    } else {
        Serial.println("📍 GPS: Sin señal");
    }
    
    Serial.printf("🏃 Actividad: %s (Magnitud: %.2f)\n", 
                  imuData.activityState.c_str(), imuData.magnitude);
    
    Serial.println("===============================================\n");
}
