/*
 * ESP32-C6 Pet Tracker - Versión de PRUEBA
 * Para verificar conexión con la aplicación web
 * Envía datos simulados para probar el sistema completo
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// CONFIGURACIÓN WIFI
const char* ssid = "WILLY 2.4G";
const char* password = "30429088";

// CONFIGURACIÓN SOKETI
const char* host = "soketi-production-a060.up.railway.app";
const char* app_id = "2MkkLyzX";
const char* key = "wigli6jxrshlpmocqtm9ywevffhq21e4";
const char* channel = "pet-tracker";

// DATOS SIMULADOS PARA PRUEBA
struct {
    double lat = 40.416775;  // Madrid centro
    double lon = -3.703790;
    int battery = 85;
    String activity = "walking";
    bool wifiConnected = false;
} testData;

unsigned long lastLocation = 0;
unsigned long lastIMU = 0;
unsigned long lastStatus = 0;

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("==========================================");
    Serial.println("🧪 ESP32-C6 Pet Tracker - MODO PRUEBA");
    Serial.println("🎯 Verificando conexión con web app");
    Serial.println("==========================================");
    
    // Conectar WiFi
    WiFi.begin(ssid, password);
    Serial.print("Conectando a WiFi");
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        testData.wifiConnected = true;
        Serial.println(" ✅ CONECTADO");
        Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("RSSI: %d dBm\n", WiFi.RSSI());
        Serial.println("\n🚀 INICIANDO ENVÍO DE DATOS DE PRUEBA...");
    } else {
        Serial.println(" ❌ FALLO EN WIFI");
        Serial.println("❗ Verifica SSID y contraseña");
    }
}

void loop() {
    if (!testData.wifiConnected) {
        Serial.println("❌ Sin WiFi - reintentando...");
        delay(5000);
        return;
    }
    
    unsigned long now = millis();
    
    // Enviar ubicación cada 2 segundos (para prueba)
    if (now - lastLocation > 2000) {
        sendTestLocation();
        lastLocation = now;
    }
    
    // Enviar IMU cada 1 segundo (para prueba)
    if (now - lastIMU > 1000) {
        sendTestIMU();
        lastIMU = now;
    }
    
    // Enviar estado cada 3 segundos (para prueba)
    if (now - lastStatus > 3000) {
        sendTestStatus();
        lastStatus = now;
    }
    
    // Simular movimiento de mascota
    simulateMovement();
    
    delay(100);
}

void sendTestLocation() {
    StaticJsonDocument<250> doc;
    doc["event"] = "location-update";
    doc["channel"] = channel;
    
    JsonObject data = doc.createNestedObject("data");
    data["petId"] = "pet-001";
    data["latitude"] = testData.lat;
    data["longitude"] = testData.lon;
    data["timestamp"] = millis();
    data["accuracy"] = 5.0;
    data["altitude"] = 650.0;
    
    String json;
    serializeJson(doc, json);
    
    if (sendToSoketi(json)) {
        Serial.printf("📍 Ubicación enviada: %.6f, %.6f\n", testData.lat, testData.lon);
    } else {
        Serial.println("❌ Error enviando ubicación");
    }
}

void sendTestIMU() {
    StaticJsonDocument<300> doc;
    doc["event"] = "imu-update";
    doc["channel"] = channel;
    
    JsonObject data = doc.createNestedObject("data");
    data["petId"] = "pet-001";
    data["accelX"] = random(-100, 100) / 100.0;
    data["accelY"] = random(-100, 100) / 100.0;
    data["accelZ"] = random(900, 1100) / 100.0; // ~9.8 (gravedad)
    data["gyroX"] = random(-50, 50) / 10.0;
    data["gyroY"] = random(-50, 50) / 10.0;
    data["gyroZ"] = random(-50, 50) / 10.0;
    data["timestamp"] = millis();
    data["activityState"] = testData.activity;
    
    String json;
    serializeJson(doc, json);
    
    if (sendToSoketi(json)) {
        Serial.printf("📊 IMU enviado: %s\n", testData.activity.c_str());
    } else {
        Serial.println("❌ Error enviando IMU");
    }
}

void sendTestStatus() {
    StaticJsonDocument<200> doc;
    doc["event"] = "status-update";
    doc["channel"] = channel;
    
    JsonObject data = doc.createNestedObject("data");
    data["petId"] = "pet-001";
    data["status"] = "online";
    data["batteryLevel"] = testData.battery;
    data["signalStrength"] = map(WiFi.RSSI(), -100, -30, 0, 100);
    data["timestamp"] = millis();
    
    String json;
    serializeJson(doc, json);
    
    if (sendToSoketi(json)) {
        Serial.printf("🔋 Estado enviado: %d%% batería\n", testData.battery);
    } else {
        Serial.println("❌ Error enviando estado");
    }
}

void simulateMovement() {
    static unsigned long lastMove = 0;
    static int activityCycle = 0;
    
    if (millis() - lastMove > 5000) { // Cambiar actividad cada 5 segundos
        String activities[] = {"lying", "standing", "walking", "running"};
        testData.activity = activities[activityCycle % 4];
        activityCycle++;
        
        // Simular movimiento ligero en las coordenadas
        testData.lat += (random(-10, 10) / 1000000.0); // ±0.00001 grados
        testData.lon += (random(-10, 10) / 1000000.0);
        
        // Simular descarga de batería
        if (random(0, 10) > 7) { // 30% de probabilidad
            testData.battery = max(0, testData.battery - 1);
        }
        
        lastMove = millis();
        Serial.printf("🎲 Actividad cambiada a: %s\n", testData.activity.c_str());
    }
}

bool sendToSoketi(String jsonData) {
    HTTPClient http;
    http.begin("https://" + String(host) + "/apps/" + String(app_id) + "/events");
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + String(key));
    http.setTimeout(5000);
    
    int httpResponseCode = http.POST(jsonData);
    bool success = (httpResponseCode == 200 || httpResponseCode == 201);
    
    if (!success) {
        Serial.printf("❌ HTTP Error: %d\n", httpResponseCode);
        if (httpResponseCode > 0) {
            String response = http.getString();
            Serial.printf("   Respuesta: %s\n", response.c_str());
        }
    }
    
    http.end();
    return success;
}
