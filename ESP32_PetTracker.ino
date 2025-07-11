#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <Wire.h>
#include <MPU6050.h>

// WiFi
const char* ssid = "WILLY 2.4G";
const char* password = "30429088";

// Soketi
const char* host = "soketi-production-a060.up.railway.app";
const char* app_id = "2MkkLyzX";
const char* key = "wigli6jxrshlpmocqtm9ywevffhq21e4";
const char* channel = "pet-tracker";

// Hardware - PINES CORREGIDOS PARA ESP32-C6
HardwareSerial gpsSerial(1); // Usar UART1
MPU6050 mpu;

// GPS struct optimizada
struct {
  float lat, lon, alt, hdop;
  int sats;
  bool ok;
} gps;

String gpsBuf;
bool gpsOK = false;

// IMU
int16_t ax, ay, az;
float mag = 0;
char act[12] = "unknown";

// Timing
unsigned long lastLoc = 0, lastIMU = 0, lastStat = 0;

// Estado
int bat = 85;
bool wifi = false;

void setup() {
  Serial.begin(115200);
  
  // GPS en pines correctos para ESP32-C6
  gpsSerial.begin(9600, SERIAL_8N1, 4, 5); // RX=4, TX=5
  
  Serial.println("ESP32C6 Pet Tracker v2.2 - Ultra");
  
  // IMU
  Wire.begin();
  mpu.initialize();
  if (mpu.testConnection()) {
    Serial.println("MPU6050 OK");
    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_4);
  }
  
  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("WiFi...");
  
  int i = 0;
  while (WiFi.status() != WL_CONNECTED && i++ < 20) {
    delay(500);
    Serial.print(".");
  }
  
  wifi = (WiFi.status() == WL_CONNECTED);
  if (wifi) {
    Serial.println(" OK");
  } else {
    Serial.println(" FAIL");
  }
  
  Serial.println("Ready");
}

void loop() {
  readGPS();
  readIMU();
  updateActivity();
  
  unsigned long now = millis();
  
  // Check WiFi every 15s
  static unsigned long wifiCheck = 0;
  if (now - wifiCheck > 15000) {
    wifi = (WiFi.status() == WL_CONNECTED);
    wifiCheck = now;
  }
  
  // Send data
  if (wifi && gpsOK && now - lastLoc > 5000) {
    sendLoc();
    lastLoc = now;
  }
  
  if (wifi && now - lastIMU > 3000) {
    sendIMU();
    lastIMU = now;
  }
  
  if (wifi && now - lastStat > 20000) {
    sendStat();
    lastStat = now;
  }
  
  delay(200);
}

void readGPS() {
  while (gpsSerial.available()) {
    char c = gpsSerial.read();
    if (c == '\n') {
      if (gpsBuf.startsWith("$GPGGA")) {
        parseGPS();
      }
      gpsBuf = "";
    } else if (gpsBuf.length() < 100) {
      gpsBuf += c;
    }
  }
}

void parseGPS() {
  int idx[12];
  int n = 0;
  
  for (int i = 0; i < gpsBuf.length() && n < 12; i++) {
    if (gpsBuf[i] == ',') idx[n++] = i;
  }
  
  if (n < 9) return;
  
  // Check fix quality
  if (gpsBuf.substring(idx[5]+1, idx[6]) == "0") {
    gps.ok = false;
    return;
  }
  
  // Parse lat/lon
  String lat = gpsBuf.substring(idx[1]+1, idx[2]);
  String latDir = gpsBuf.substring(idx[2]+1, idx[3]);
  String lon = gpsBuf.substring(idx[3]+1, idx[4]);
  String lonDir = gpsBuf.substring(idx[4]+1, idx[5]);
  
  if (lat.length() > 4 && lon.length() > 4) {
    gps.lat = parseDMS(lat, latDir);
    gps.lon = parseDMS(lon, lonDir);
    gps.sats = gpsBuf.substring(idx[6]+1, idx[7]).toInt();
    gps.hdop = gpsBuf.substring(idx[7]+1, idx[8]).toFloat();
    gps.alt = gpsBuf.substring(idx[8]+1, idx[9]).toFloat();
    gps.ok = true;
    gpsOK = true;
    
    static unsigned long lastPrint = 0;
    if (millis() - lastPrint > 10000) {
      Serial.printf("GPS: %.6f,%.6f\n", gps.lat, gps.lon);
      lastPrint = millis();
    }
  }
}

float parseDMS(String dms, String dir) {
  if (dms.length() < 4) return 0;
  
  int dot = dms.indexOf('.');
  if (dot < 2) return 0;
  
  float deg = dms.substring(0, dot-2).toFloat();
  float min = dms.substring(dot-2).toFloat();
  float dec = deg + (min / 60.0);
  
  if (dir == "S" || dir == "W") dec = -dec;
  return dec;
}

void readIMU() {
  mpu.getAcceleration(&ax, &ay, &az);
  
  float x = ax / 8192.0;
  float y = ay / 8192.0;
  float z = az / 8192.0;
  
  mag = sqrt(x*x + y*y + z*z);
}

void updateActivity() {
  static float prev = 0;
  static unsigned long lastMove = 0;
  
  float diff = abs(mag - prev);
  prev = mag;
  
  if (diff > 1.5) {
    lastMove = millis();
    if (diff > 3.0) strcpy(act, "running");
    else if (diff > 1.0) strcpy(act, "walking");
    else strcpy(act, "standing");
  } else if (millis() - lastMove > 5000) {
    strcpy(act, "lying");
  }
}

void sendLoc() {
  if (!gps.ok) return;
  
  StaticJsonDocument<200> doc;
  doc["event"] = "location-update";
  doc["channel"] = channel;
  
  JsonObject data = doc.createNestedObject("data");
  data["petId"] = "pet-001";
  data["latitude"] = gps.lat;
  data["longitude"] = gps.lon;
  data["timestamp"] = millis();
  data["accuracy"] = gps.hdop * 3;
  data["altitude"] = gps.alt;
  
  String json;
  serializeJson(doc, json);
  
  if (postHTTP(json)) {
    Serial.printf("Loc: %.6f,%.6f\n", gps.lat, gps.lon);
  }
}

void sendIMU() {
  StaticJsonDocument<180> doc;
  doc["event"] = "imu-update";
  doc["channel"] = channel;
  
  JsonObject data = doc.createNestedObject("data");
  data["petId"] = "pet-001";
  data["accelX"] = ax / 8192.0;
  data["accelY"] = ay / 8192.0;
  data["accelZ"] = az / 8192.0;
  data["timestamp"] = millis();
  data["activityState"] = act;
  
  String json;
  serializeJson(doc, json);
  
  if (postHTTP(json)) {
    Serial.println("IMU: " + String(act));
  }
}

void sendStat() {
  bat = max(20, bat - random(0, 2));
  
  StaticJsonDocument<160> doc;
  doc["event"] = "status-update";
  doc["channel"] = channel;
  
  JsonObject data = doc.createNestedObject("data");
  data["petId"] = "pet-001";
  data["status"] = "online";
  data["batteryLevel"] = bat;
  data["signalStrength"] = map(WiFi.RSSI(), -100, -30, 0, 100);
  data["timestamp"] = millis();
  
  String json;
  serializeJson(doc, json);
  
  if (postHTTP(json)) {
    Serial.printf("Stat: %d%%\n", bat);
  }
}

bool postHTTP(String json) {
  HTTPClient http;
  http.begin("https://" + String(host) + "/apps/" + String(app_id) + "/events");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + String(key));
  http.setTimeout(3000);
  
  int code = http.POST(json);
  http.end();
  
  return (code == 200 || code == 201);
}
