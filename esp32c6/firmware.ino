#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPSPlus.h>

// Pines I2C
#define SDA_PIN 8
#define SCL_PIN 9

// Pines UART para GPS
#define GPS_RX 17  // RX del ESP32 (conectado al TX del GPS)
#define GPS_TX 16  // TX del ESP32 (conectado al RX del GPS)

// Configuración WiFi (OBLIGATORIO CAMBIAR)
const char* ssid = "TU_WIFI_SSID";           // Nombre de tu red WiFi
const char* password = "TU_WIFI_PASSWORD";    // Contraseña de tu WiFi

// WebSocket Railway
const char* ws_host = "pet-tracker-production.up.railway.app";
const int ws_port = 443;
const char* ws_path = "/ws";

WebSocketsClient ws;
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;
HardwareSerial SerialGPS(1);

unsigned long lastSend = 0;

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_CONNECTED) Serial.println("✅ WebSocket conectado!");
  if (type == WStype_DISCONNECTED) Serial.println("❌ WebSocket desconectado!");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=== INICIANDO ESP32C6 PET TRACKER ===");

  Serial.print("Inicializando I2C... ");
  Wire.begin(SDA_PIN, SCL_PIN);
  Serial.println("OK");

  Serial.print("Inicializando GPS UART... ");
  SerialGPS.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  Serial.println("OK");

  Serial.print("Conectando a WiFi... ");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi conectado!");

  Serial.print("Inicializando MPU6050... ");
  if (mpu.begin()) {
    mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
    mpu.setGyroRange(MPU6050_RANGE_250_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println("OK");
  } else {
    Serial.println("FALLÓ (el código seguirá sin IMU)");
  }

  Serial.print("Conectando a WebSocket... ");
  ws.beginSSL(ws_host, ws_port, ws_path);
  ws.onEvent(webSocketEvent);
  Serial.println("OK");
}

void loop() {
  ws.loop();
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }

  unsigned long now = millis();
  if (now - lastSend > 5000) { // Cada 5 segundos
    sendPetData();
    lastSend = now;
  }
}

void sendPetData() {
  // GPS real
  float latitude = 0.0, longitude = 0.0;
  bool gpsValid = false;
  if (gps.location.isValid()) {
    latitude = gps.location.lat();
    longitude = gps.location.lng();
    gpsValid = true;
  }

  // IMU (tolerante a error)
  float magnitude = 0.0;
  String activity = "unknown";
  float accelX = 0, accelY = 0, accelZ = 0, gyroX = 0, gyroY = 0, gyroZ = 0, tempC = 0;
  if (mpu.begin()) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    accelX = a.acceleration.x;
    accelY = a.acceleration.y;
    accelZ = a.acceleration.z;
    gyroX = g.gyro.x;
    gyroY = g.gyro.y;
    gyroZ = g.gyro.z;
    tempC = temp.temperature;
    magnitude = sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);
    activity = (magnitude > 10.5) ? "standing" : "lying";
  }

  // JSON
  StaticJsonDocument<512> doc;
  doc["petId"] = 1;
  doc["deviceId"] = "ESP32C6_MAX";
  doc["timestamp"] = millis();
  doc["battery"] = 100;
  doc["activity"] = activity;
  doc["imu_magnitude"] = magnitude;
  doc["gps_valid"] = gpsValid;

  if (gpsValid) {
    doc["latitude"] = latitude;
    doc["longitude"] = longitude;
  } else {
    doc["latitude"] = nullptr;
    doc["longitude"] = nullptr;
  }

  JsonObject accel = doc.createNestedObject("accelerometer");
  accel["x"] = accelX;
  accel["y"] = accelY;
  accel["z"] = accelZ;
  JsonObject gyro = doc.createNestedObject("gyroscope");
  gyro["x"] = gyroX;
  gyro["y"] = gyroY;
  gyro["z"] = gyroZ;
  doc["temperature"] = tempC;

  String message;
  serializeJson(doc, message);
  ws.sendTXT(message);
  Serial.println("📤 Enviado: " + message);
}