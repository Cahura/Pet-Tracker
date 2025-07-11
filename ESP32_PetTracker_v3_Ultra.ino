/*
 * ESP32-C6 Pet Tracker - Versión 3.1 Ultra-Optimizada
 * Tamaño reducido para upload más estable
 * Compatible 100% con la aplicación web
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <Wire.h>
#include <MPU6050.h>

// CONFIGURACIÓN
const char* ssid = "WILLY 2.4G";
const char* password = "30429088";
const char* host = "soketi-production-a060.up.railway.app";
const char* app_id = "2MkkLyzX";
const char* key = "wigli6jxrshlpmocqtm9ywevffhq21e4";
const char* channel = "pet-tracker";

// HARDWARE
HardwareSerial gpsSerial(1);
MPU6050 mpu;

// DATOS GPS
struct {
    double lat, lon, alt, hdop;
    int sats;
    bool fix;
} gps;

// DATOS IMU
struct {
    double ax, ay, az, gx, gy, gz, mag;
    String activity;
} imu;

// ESTADO
struct {
    bool wifi;
    int battery;
    int signal;
    String status;
} sys = {false, 100, 0, "offline"};

String gpsBuf;
unsigned long lastLoc = 0, lastIMU = 0, lastStat = 0;

void setup() {
    Serial.begin(115200);
    delay(500);
    
    Serial.println("ESP32-C6 Pet Tracker v3.1 Ultra");
    
    // GPS
    gpsSerial.begin(9600, SERIAL_8N1, 17, 16);
    
    // IMU
    Wire.begin(21, 22);
    mpu.initialize();
    if (mpu.testConnection()) {
        mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_4);
        Serial.println("MPU6050 OK");
    }
    
    // WiFi
    WiFi.begin(ssid, password);
    Serial.print("WiFi...");
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 15) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        sys.wifi = true;
        sys.status = "online";
        Serial.println(" OK");
        Serial.println("IP: " + WiFi.localIP().toString());
    } else {
        Serial.println(" FAIL");
    }
    
    Serial.println("Sistema listo");
}

void loop() {
    readGPS();
    readIMU();
    updateSystem();
    
    unsigned long now = millis();
    
    // Verificar WiFi cada 10s
    static unsigned long wifiCheck = 0;
    if (now - wifiCheck > 10000) {
        sys.wifi = (WiFi.status() == WL_CONNECTED);
        wifiCheck = now;
    }
    
    // Enviar datos
    if (sys.wifi) {
        if (gps.fix && now - lastLoc > 1000) {
            sendLocation();
            lastLoc = now;
        }
        
        if (now - lastIMU > 500) {
            sendIMU();
            lastIMU = now;
        }
        
        if (now - lastStat > 5000) {
            sendStatus();
            lastStat = now;
        }
    }
    
    delay(100);
}

void readGPS() {
    while (gpsSerial.available()) {
        char c = gpsSerial.read();
        if (c == '\n') {
            if (gpsBuf.startsWith("$GPGGA") || gpsBuf.startsWith("$GNGGA")) {
                parseGPS();
            }
            gpsBuf = "";
        } else if (c != '\r' && gpsBuf.length() < 100) {
            gpsBuf += c;
        }
    }
}

void parseGPS() {
    int idx[15];
    int n = 0;
    
    for (int i = 0; i < gpsBuf.length() && n < 15; i++) {
        if (gpsBuf[i] == ',') idx[n++] = i;
    }
    
    if (n < 9) return;
    
    String fixQuality = gpsBuf.substring(idx[5] + 1, idx[6]);
    if (fixQuality == "0") {
        gps.fix = false;
        return;
    }
    
    String latStr = gpsBuf.substring(idx[1] + 1, idx[2]);
    String latDir = gpsBuf.substring(idx[2] + 1, idx[3]);
    String lonStr = gpsBuf.substring(idx[3] + 1, idx[4]);
    String lonDir = gpsBuf.substring(idx[4] + 1, idx[5]);
    
    if (latStr.length() > 4 && lonStr.length() > 4) {
        gps.lat = convertDMS(latStr, latDir);
        gps.lon = convertDMS(lonStr, lonDir);
        gps.sats = gpsBuf.substring(idx[6] + 1, idx[7]).toInt();
        gps.hdop = gpsBuf.substring(idx[7] + 1, idx[8]).toFloat();
        gps.alt = gpsBuf.substring(idx[8] + 1, idx[9]).toFloat();
        gps.fix = true;
        
        static unsigned long lastLog = 0;
        if (millis() - lastLog > 10000) {
            Serial.printf("GPS: %.6f,%.6f\n", gps.lat, gps.lon);
            lastLog = millis();
        }
    }
}

double convertDMS(String dms, String dir) {
    if (dms.length() < 4) return 0.0;
    
    int dot = dms.indexOf('.');
    if (dot < 2) return 0.0;
    
    double deg = dms.substring(0, dot - 2).toDouble();
    double min = dms.substring(dot - 2).toDouble();
    double dec = deg + (min / 60.0);
    
    if (dir == "S" || dir == "W") dec = -dec;
    
    return dec;
}

void readIMU() {
    if (!mpu.testConnection()) return;
    
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
    
    imu.ax = ax / 8192.0;
    imu.ay = ay / 8192.0;
    imu.az = az / 8192.0;
    imu.gx = gx / 65.5;
    imu.gy = gy / 65.5;
    imu.gz = gz / 65.5;
    
    imu.mag = sqrt(imu.ax * imu.ax + imu.ay * imu.ay + imu.az * imu.az);
    
    updateActivity();
}

void updateActivity() {
    static double prevMag = 0.0;
    static unsigned long lastMove = 0;
    
    double diff = abs(imu.mag - prevMag);
    prevMag = imu.mag;
    
    if (diff > 2.5) {
        lastMove = millis();
        imu.activity = "running";
    } else if (diff > 1.2) {
        lastMove = millis();
        imu.activity = "walking";
    } else if (diff > 0.3) {
        lastMove = millis();
        imu.activity = "standing";
    } else if (millis() - lastMove > 3000) {
        imu.activity = "lying";
    }
    
    if (imu.activity.length() == 0) {
        imu.activity = "unknown";
    }
}

void updateSystem() {
    // Batería
    static unsigned long lastBat = 0;
    if (millis() - lastBat > 60000) {
        int drain = (int)random(0, 2); // Conversión explícita de long a int
        sys.battery = max(0, sys.battery - drain);
        lastBat = millis();
    }
    
    // Señal WiFi
    if (sys.wifi) {
        int rssi = WiFi.RSSI();
        sys.signal = map(rssi, -100, -30, 0, 100);
        sys.signal = constrain(sys.signal, 0, 100);
        sys.status = "online";
    } else {
        sys.signal = 0;
        sys.status = "offline";
    }
}

void sendLocation() {
    if (!gps.fix) return;
    
    StaticJsonDocument<250> doc;
    doc["event"] = "location-update";
    doc["channel"] = channel;
    
    JsonObject data = doc.createNestedObject("data");
    data["petId"] = "pet-001";
    data["latitude"] = gps.lat;
    data["longitude"] = gps.lon;
    data["timestamp"] = millis();
    data["accuracy"] = gps.hdop * 3.0;
    data["altitude"] = gps.alt;
    
    String json;
    serializeJson(doc, json);
    
    if (postHTTP(json)) {
        Serial.printf("Loc: %.6f,%.6f\n", gps.lat, gps.lon);
    }
}

void sendIMU() {
    StaticJsonDocument<300> doc;
    doc["event"] = "imu-update";
    doc["channel"] = channel;
    
    JsonObject data = doc.createNestedObject("data");
    data["petId"] = "pet-001";
    data["accelX"] = imu.ax;
    data["accelY"] = imu.ay;
    data["accelZ"] = imu.az;
    data["gyroX"] = imu.gx;
    data["gyroY"] = imu.gy;
    data["gyroZ"] = imu.gz;
    data["timestamp"] = millis();
    data["activityState"] = imu.activity;
    
    String json;
    serializeJson(doc, json);
    
    if (postHTTP(json)) {
        Serial.printf("IMU: %s\n", imu.activity.c_str());
    }
}

void sendStatus() {
    StaticJsonDocument<200> doc;
    doc["event"] = "status-update";
    doc["channel"] = channel;
    
    JsonObject data = doc.createNestedObject("data");
    data["petId"] = "pet-001";
    data["status"] = sys.status;
    data["batteryLevel"] = sys.battery;
    data["signalStrength"] = sys.signal;
    data["timestamp"] = millis();
    
    String json;
    serializeJson(doc, json);
    
    if (postHTTP(json)) {
        Serial.printf("Status: %s (%d%% bat)\n", sys.status.c_str(), sys.battery);
    }
}

bool postHTTP(String json) {
    HTTPClient http;
    http.begin("https://" + String(host) + "/apps/" + String(app_id) + "/events");
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + String(key));
    http.setTimeout(3000);
    
    int code = http.POST(json);
    bool success = (code == 200 || code == 201);
    
    if (!success) {
        Serial.printf("HTTP Error: %d\n", code);
    }
    
    http.end();
    return success;
}
