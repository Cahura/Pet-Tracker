#include <WiFi.h>
#include <SocketIOclient.h>
#include <ArduinoJson.h>

// Configuración Wi-Fi (modificar según tu red)
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";

// Configuración Socket.IO (modificar según tu servidor)
const char* socketIOHost = "TU_BACKEND.up.railway.app";
const int socketIOPort = 443; // 443 para HTTPS, 80 para HTTP local
const char* socketIOPath = "/socket.io/?EIO=4";

// Configuración del dispositivo
const String DEVICE_ID = "ESP32C6_001";
const int PET_ID = 1; // ID de la mascota (Max=1, Luna=2, Charlie=3, Bella=4)

// Variables de tracking
bool isTracking = false;
unsigned long lastSendTime = 0;
unsigned long trackingInterval = 5000; // 5 segundos por defecto
float minDistance = 10.0; // 10 metros por defecto

// Simulación GPS (reemplazar por GPS real)
float currentLat = -12.1165;
float currentLng = -77.0317;
float lastLat = 0;
float lastLng = 0;

// Variables del sistema
int batteryLevel = 100;
float gpsAccuracy = 5.0;
float currentSpeed = 0.0;
String currentActivity = "resting";

// Cliente Socket.IO
SocketIOclient socketIO;

// Prototipos de funciones
void setupWiFi();
void setupSocketIO();
void socketIOEvent(socketIOmessageType_t type, uint8_t * payload, size_t length);
void sendGPSData();
void simulateGPSMovement();
float calculateDistance(float lat1, float lng1, float lat2, float lng2);
void updateBattery();
void handleStartTracking(String payload);
void handleStopTracking(String payload);
void handleSafeZoneConfig(String payload);

void setup() {
  Serial.begin(115200);
  Serial.println("🚀 Iniciando Pet Tracker ESP32C6...");
  
  // Configurar Wi-Fi
  setupWiFi();
  
  // Configurar Socket.IO
  setupSocketIO();
  
  Serial.println("✅ Sistema listo. Esperando comandos...");
}

void loop() {
  // Mantener conexión Socket.IO
  socketIO.loop();
  
  // Enviar datos GPS si está en tracking
  if (isTracking) {
    unsigned long currentTime = millis();
    
    if (currentTime - lastSendTime >= trackingInterval) {
      // Simular movimiento GPS
      simulateGPSMovement();
      
      // Verificar distancia mínima
      float distance = calculateDistance(lastLat, lastLng, currentLat, currentLng);
      
      if (distance >= minDistance || lastLat == 0) {
        sendGPSData();
        lastSendTime = currentTime;
        lastLat = currentLat;
        lastLng = currentLng;
      }
    }
  }
  
  // Actualizar batería
  updateBattery();
  
  delay(100); // Pequeña pausa para evitar sobrecarga
}

void setupWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("🔌 Conectando a WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.print("✅ WiFi conectado. IP: ");
  Serial.println(WiFi.localIP());
}

void setupSocketIO() {
  // Configurar Socket.IO
  socketIO.begin(socketIOHost, socketIOPort, socketIOPath);
  socketIO.onEvent(socketIOEvent);
  
  Serial.println("🔗 Conectando a Socket.IO...");
}

void socketIOEvent(socketIOmessageType_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case sIOtype_DISCONNECT:
      Serial.println("🔴 Desconectado de Socket.IO");
      break;
      
    case sIOtype_CONNECT:
      Serial.println("🟢 Conectado a Socket.IO");
      // Registrar dispositivo
      {
        DynamicJsonDocument doc(1024);
        doc["deviceId"] = DEVICE_ID;
        doc["petId"] = PET_ID;
        doc["timestamp"] = millis();
        
        String output;
        serializeJson(doc, output);
        socketIO.emit("esp32-connect", output.c_str());
      }
      break;
      
    case sIOtype_EVENT:
      {
        String eventName = (char*)payload;
        Serial.print("📨 Evento recibido: ");
        Serial.println(eventName);
        
        if (eventName.indexOf("startTracking") >= 0) {
          handleStartTracking(eventName);
        } else if (eventName.indexOf("stopTracking") >= 0) {
          handleStopTracking(eventName);
        } else if (eventName.indexOf("configureSafeZone") >= 0) {
          handleSafeZoneConfig(eventName);
        }
      }
      break;
      
    case sIOtype_ACK:
      Serial.println("✅ ACK recibido");
      break;
      
    case sIOtype_ERROR:
      Serial.print("❌ Error Socket.IO: ");
      Serial.println((char*)payload);
      break;
      
    default:
      break;
  }
}

void handleStartTracking(String payload) {
  Serial.println("▶️ Iniciando tracking...");
  
  // Parsear configuración del payload si está disponible
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, payload);
  
  if (doc.containsKey("interval")) {
    trackingInterval = doc["interval"];
  }
  if (doc.containsKey("minDistance")) {
    minDistance = doc["minDistance"];
  }
  
  isTracking = true;
  lastSendTime = 0; // Enviar inmediatamente
  
  Serial.print("📍 Tracking activo - Intervalo: ");
  Serial.print(trackingInterval);
  Serial.print("ms, Distancia mínima: ");
  Serial.print(minDistance);
  Serial.println("m");
}

void handleStopTracking(String payload) {
  Serial.println("⏹️ Deteniendo tracking...");
  isTracking = false;
}

void handleSafeZoneConfig(String payload) {
  Serial.println("🛡️ Configurando zona segura...");
  
  // Aquí implementarías la lógica de zona segura
  // Por ahora solo logueamos la configuración
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, payload);
  
  if (doc.containsKey("center") && doc.containsKey("radius")) {
    Serial.print("Centro: ");
    Serial.print(doc["center"][0].as<float>());
    Serial.print(", ");
    Serial.print(doc["center"][1].as<float>());
    Serial.print(" - Radio: ");
    Serial.print(doc["radius"].as<float>());
    Serial.println("m");
  }
}

void sendGPSData() {
  DynamicJsonDocument doc(1024);
  
  doc["petId"] = PET_ID;
  doc["deviceId"] = DEVICE_ID;
  doc["latitude"] = currentLat;
  doc["longitude"] = currentLng;
  doc["battery"] = batteryLevel;
  doc["accuracy"] = gpsAccuracy;
  doc["speed"] = currentSpeed;
  doc["activity"] = currentActivity;
  doc["timestamp"] = millis();
  
  String output;
  serializeJson(doc, output);
  
  socketIO.emit("gps-data", output.c_str());
  
  Serial.print("📍 GPS enviado: ");
  Serial.print(currentLat, 6);
  Serial.print(", ");
  Serial.print(currentLng, 6);
  Serial.print(" - Batería: ");
  Serial.print(batteryLevel);
  Serial.println("%");
}

void simulateGPSMovement() {
  // Simulación simple de movimiento GPS
  // En implementación real, aquí leerías del módulo GPS
  
  static unsigned long lastMoveTime = 0;
  static float deltaLat = 0.0001;
  static float deltaLng = 0.0001;
  
  if (millis() - lastMoveTime >= 2000) { // Cambiar dirección cada 2 segundos
    deltaLat = random(-10, 11) * 0.00001; // Movimiento aleatorio pequeño
    deltaLng = random(-10, 11) * 0.00001;
    lastMoveTime = millis();
    
    // Simular diferentes actividades
    int activityRandom = random(0, 100);
    if (activityRandom < 60) {
      currentActivity = "walking";
      currentSpeed = random(10, 30) / 10.0; // 1-3 km/h
    } else if (activityRandom < 80) {
      currentActivity = "running";
      currentSpeed = random(30, 60) / 10.0; // 3-6 km/h
    } else if (activityRandom < 90) {
      currentActivity = "playing";
      currentSpeed = random(5, 20) / 10.0; // 0.5-2 km/h
    } else {
      currentActivity = "resting";
      currentSpeed = 0;
    }
  }
  
  if (currentActivity != "resting") {
    currentLat += deltaLat;
    currentLng += deltaLng;
    
    // Mantener dentro de límites razonables para Lima
    currentLat = constrain(currentLat, -12.2, -12.0);
    currentLng = constrain(currentLng, -77.1, -76.9);
  }
}

float calculateDistance(float lat1, float lng1, float lat2, float lng2) {
  // Fórmula de Haversine para calcular distancia
  const float R = 6371000; // Radio de la Tierra en metros
  
  float dLat = radians(lat2 - lat1);
  float dLng = radians(lng2 - lng1);
  
  float a = sin(dLat/2) * sin(dLat/2) +
            cos(radians(lat1)) * cos(radians(lat2)) *
            sin(dLng/2) * sin(dLng/2);
  
  float c = 2 * atan2(sqrt(a), sqrt(1-a));
  
  return R * c;
}

void updateBattery() {
  static unsigned long lastBatteryUpdate = 0;
  
  if (millis() - lastBatteryUpdate >= 60000) { // Actualizar cada minuto
    if (isTracking) {
      batteryLevel = max(0, batteryLevel - 1); // Consumo más rápido si está tracking
    } else {
      batteryLevel = max(0, batteryLevel - 1); // Consumo lento en standby
    }
    
    lastBatteryUpdate = millis();
    
    // Alerta de batería baja
    if (batteryLevel <= 20) {
      DynamicJsonDocument doc(512);
      doc["petId"] = PET_ID;
      doc["deviceId"] = DEVICE_ID;
      doc["battery"] = batteryLevel;
      doc["alert"] = "low_battery";
      
      String output;
      serializeJson(doc, output);
      socketIO.emit("battery-alert", output.c_str());
    }
  }
}
