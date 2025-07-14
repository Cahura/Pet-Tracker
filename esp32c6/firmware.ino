#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <MPU6050.h>

// Configuración WiFi
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";

// Configuración del servidor Socket.IO para Railway
const char* websockets_server = "pet-tracker-production.up.railway.app";
const int websockets_port = 443;

// Cliente WebSocket
using namespace websockets;
WebsocketsClient client;

// Sensor MPU6050
MPU6050 mpu;

// Variables para almacenar datos del sensor
struct IMUData {
  float accelX, accelY, accelZ;
  float gyroX, gyroY, gyroZ;
  float temperature;
  unsigned long timestamp;
};

struct ActivityState {
  String state;
  float confidence;
  float accelMagnitude;
  float gyroMagnitude;
  unsigned long timestamp;
};

// Configuración de mascota
const int PET_ID = 1; // ID de Max
String petName = "Max";

// Variables de control
unsigned long lastIMUReading = 0;
unsigned long lastActivitySend = 0;
unsigned long lastGPSSend = 0;
unsigned long lastBatterySend = 0;

const unsigned long IMU_INTERVAL = 100;     // Leer IMU cada 100ms
const unsigned long ACTIVITY_INTERVAL = 3000;  // Enviar actividad cada 3s
const unsigned long GPS_INTERVAL = 5000;    // Enviar GPS cada 5s
const unsigned long BATTERY_INTERVAL = 30000; // Enviar batería cada 30s

// Buffer para promediar lecturas del IMU
const int BUFFER_SIZE = 10;
IMUData imuBuffer[BUFFER_SIZE];
int bufferIndex = 0;
bool bufferFull = false;

// Estado actual de actividad
ActivityState currentActivity;

// Coordenadas GPS simuladas para Max en Lima
float latitude = -12.0464;
float longitude = -77.0428;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("🚀 Iniciando ESP32C6 Pet Tracker con MPU6050...");
  
  // Inicializar I2C
  Wire.begin(21, 22); // SDA, SCL
  
  // Inicializar MPU6050
  if (!initializeMPU6050()) {
    Serial.println("❌ Error al inicializar MPU6050");
    while(1) {
      delay(1000);
      Serial.println("🔄 Reintentando inicialización MPU6050...");
      if (initializeMPU6050()) break;
    }
  }
  
  // Conectar a WiFi
  connectToWiFi();
  
  // Configurar cliente WebSocket
  setupWebSocket();
  
  // Inicializar estado de actividad
  currentActivity = {
    .state = "lying",
    .confidence = 0.0,
    .accelMagnitude = 0.0,
    .gyroMagnitude = 0.0,
    .timestamp = millis()
  };
  
  Serial.println("✅ Sistema iniciado correctamente");
  Serial.println("📡 Enviando datos de Max (Pet ID: 1)");
}

void loop() {
  // Mantener conexión WebSocket
  client.poll();
  
  unsigned long currentTime = millis();
  
  // Leer datos del IMU a alta frecuencia
  if (currentTime - lastIMUReading >= IMU_INTERVAL) {
    readIMUData();
    lastIMUReading = currentTime;
  }
  
  // Enviar estado de actividad
  if (currentTime - lastActivitySend >= ACTIVITY_INTERVAL) {
    analyzeAndSendActivity();
    lastActivitySend = currentTime;
  }
  
  // Enviar datos GPS
  if (currentTime - lastGPSSend >= GPS_INTERVAL) {
    sendGPSData();
    lastGPSSend = currentTime;
  }
  
  // Enviar datos de batería
  if (currentTime - lastBatterySend >= BATTERY_INTERVAL) {
    sendBatteryData();
    lastBatterySend = currentTime;
  }
  
  delay(50); // Pequeña pausa para no saturar el sistema
}

bool initializeMPU6050() {
  Serial.println("🔧 Inicializando MPU6050...");
  
  mpu.initialize();
  
  if (!mpu.testConnection()) {
    Serial.println("❌ MPU6050 no encontrado");
    return false;
  }
  
  Serial.println("✅ MPU6050 inicializado correctamente");
  
  // Configurar escalas del sensor
  mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_2); // ±2g
  mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_250); // ±250°/s
  
  // Configurar filtro pasa-bajos
  mpu.setDLPFMode(MPU6050_DLPF_BW_20); // 20Hz
  
  // Calibrar sensor (opcional - en reposo)
  Serial.println("🎯 Calibrando MPU6050 (mantener inmóvil 3 segundos)...");
  delay(3000);
  
  return true;
}

void connectToWiFi() {
  Serial.print("📡 Conectando a WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("✅ WiFi conectado!");
  Serial.print("📍 IP address: ");
  Serial.println(WiFi.localIP());
}

void setupWebSocket() {
  Serial.println("🔌 Configurando WebSocket...");
  
  // Configurar eventos del WebSocket
  client.onMessage([](WebsocketsMessage message) {
    Serial.print("📨 Mensaje recibido: ");
    Serial.println(message.data());
  });
  
  client.onEvent([](WebsocketsEvent event, String data) {
    if (event == WebsocketsEvent::ConnectionOpened) {
      Serial.println("✅ WebSocket conectado!");
    } else if (event == WebsocketsEvent::ConnectionClosed) {
      Serial.println("❌ WebSocket desconectado!");
    } else if (event == WebsocketsEvent::GotPing) {
      Serial.println("🏓 Ping recibido");
    } else if (event == WebsocketsEvent::GotPong) {
      Serial.println("🏓 Pong recibido");
    }
  });
  
  // Conectar al servidor
  String url = "wss://" + String(websockets_server) + ":" + String(websockets_port) + "/socket.io/?EIO=4&transport=websocket";
  
  bool connected = client.connect(url);
  
  if (connected) {
    Serial.println("✅ Conectado al servidor WebSocket");
  } else {
    Serial.println("❌ Error al conectar WebSocket");
  }
}

void readIMUData() {
  int16_t ax, ay, az;
  int16_t gx, gy, gz;
  int16_t temp;
  
  // Leer datos brutos del MPU6050
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  temp = mpu.getTemperature();
  
  // Convertir a unidades físicas
  IMUData reading;
  reading.accelX = ax / 16384.0; // Para escala ±2g
  reading.accelY = ay / 16384.0;
  reading.accelZ = az / 16384.0;
  reading.gyroX = gx / 131.0;    // Para escala ±250°/s
  reading.gyroY = gy / 131.0;
  reading.gyroZ = gz / 131.0;
  reading.temperature = temp / 340.0 + 36.53; // Fórmula del datasheet
  reading.timestamp = millis();
  
  // Agregar al buffer circular
  imuBuffer[bufferIndex] = reading;
  bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;
  if (bufferIndex == 0) bufferFull = true;
  
  // Debug cada segundo
  static unsigned long lastDebug = 0;
  if (millis() - lastDebug > 1000) {
    Serial.printf("📊 IMU - Accel: (%.2f, %.2f, %.2f)g, Gyro: (%.2f, %.2f, %.2f)°/s, Temp: %.1f°C\n",
                  reading.accelX, reading.accelY, reading.accelZ,
                  reading.gyroX, reading.gyroY, reading.gyroZ,
                  reading.temperature);
    lastDebug = millis();
  }
}

void analyzeAndSendActivity() {
  if (!bufferFull && bufferIndex < 5) return; // Necesitamos al menos 5 lecturas
  
  // Calcular promedios del buffer
  IMUData avgData = {0};
  int samples = bufferFull ? BUFFER_SIZE : bufferIndex;
  
  for (int i = 0; i < samples; i++) {
    avgData.accelX += imuBuffer[i].accelX;
    avgData.accelY += imuBuffer[i].accelY;
    avgData.accelZ += imuBuffer[i].accelZ;
    avgData.gyroX += imuBuffer[i].gyroX;
    avgData.gyroY += imuBuffer[i].gyroY;
    avgData.gyroZ += imuBuffer[i].gyroZ;
    avgData.temperature += imuBuffer[i].temperature;
  }
  
  avgData.accelX /= samples;
  avgData.accelY /= samples;
  avgData.accelZ /= samples;
  avgData.gyroX /= samples;
  avgData.gyroY /= samples;
  avgData.gyroZ /= samples;
  avgData.temperature /= samples;
  avgData.timestamp = millis();
  
  // Calcular magnitudes vectoriales
  float accelMagnitude = sqrt(avgData.accelX * avgData.accelX + 
                             avgData.accelY * avgData.accelY + 
                             avgData.accelZ * avgData.accelZ);
  
  float gyroMagnitude = sqrt(avgData.gyroX * avgData.gyroX + 
                            avgData.gyroY * avgData.gyroY + 
                            avgData.gyroZ * avgData.gyroZ);
  
  // Determinar estado de actividad
  ActivityState newActivity = analyzeActivity(accelMagnitude, gyroMagnitude);
  
  // Actualizar estado actual
  currentActivity = newActivity;
  currentActivity.accelMagnitude = accelMagnitude;
  currentActivity.gyroMagnitude = gyroMagnitude;
  currentActivity.timestamp = millis();
  
  // Enviar datos del IMU
  sendIMUData(avgData);
  
  // Enviar estado de actividad
  sendActivityState();
  
  Serial.printf("🐕 Actividad detectada: %s (confianza: %.1f%%, accel: %.2f, gyro: %.2f)\n",
                currentActivity.state.c_str(), 
                currentActivity.confidence * 100,
                accelMagnitude, 
                gyroMagnitude);
}

ActivityState analyzeActivity(float accelMag, float gyroMag) {
  ActivityState activity;
  
  // Umbrales ajustados para perros (pueden necesitar calibración)
  const float LYING_ACCEL_THRESHOLD = 9.5;
  const float LYING_GYRO_THRESHOLD = 0.5;
  
  const float STANDING_ACCEL_THRESHOLD = 10.5;
  const float STANDING_GYRO_THRESHOLD = 1.5;
  
  const float WALKING_ACCEL_THRESHOLD = 12.0;
  const float WALKING_GYRO_THRESHOLD = 3.0;
  
  const float RUNNING_ACCEL_THRESHOLD = 15.0;
  const float RUNNING_GYRO_THRESHOLD = 5.0;
  
  // Lógica de clasificación
  if (accelMag >= RUNNING_ACCEL_THRESHOLD && gyroMag >= RUNNING_GYRO_THRESHOLD) {
    activity.state = "running";
    activity.confidence = min(0.95f, (accelMag + gyroMag) / 20.0f);
  } else if (accelMag >= WALKING_ACCEL_THRESHOLD && gyroMag >= WALKING_GYRO_THRESHOLD) {
    activity.state = "walking";
    activity.confidence = min(0.90f, (accelMag + gyroMag) / 15.0f);
  } else if (accelMag >= STANDING_ACCEL_THRESHOLD && gyroMag >= STANDING_GYRO_THRESHOLD) {
    activity.state = "standing";
    activity.confidence = min(0.85f, (accelMag + gyroMag) / 12.0f);
  } else {
    activity.state = "lying";
    activity.confidence = max(0.70f, 1.0f - ((accelMag + gyroMag) / 15.0f));
  }
  
  return activity;
}

void sendIMUData(IMUData data) {
  if (!client.available()) return;
  
  // Crear JSON con datos del IMU
  StaticJsonDocument<512> doc;
  doc["petId"] = PET_ID;
  doc["deviceId"] = "ESP32C6_MAX";
  doc["timestamp"] = data.timestamp;
  
  JsonObject accel = doc.createNestedObject("accelerometer");
  accel["x"] = data.accelX;
  accel["y"] = data.accelY;
  accel["z"] = data.accelZ;
  
  JsonObject gyro = doc.createNestedObject("gyroscope");
  gyro["x"] = data.gyroX;
  gyro["y"] = data.gyroY;
  gyro["z"] = data.gyroZ;
  
  doc["temperature"] = data.temperature;
  
  String message;
  serializeJson(doc, message);
  
  // Enviar como evento de Socket.IO
  String socketIOMessage = "42[\"imu-data\"," + message + "]";
  client.send(socketIOMessage);
}

void sendActivityState() {
  if (!client.available()) return;
  
  // Crear JSON con estado de actividad
  StaticJsonDocument<256> doc;
  doc["petId"] = PET_ID;
  doc["deviceId"] = "ESP32C6_MAX";
  doc["state"] = currentActivity.state;
  doc["confidence"] = currentActivity.confidence;
  doc["magnitudes"]["accelerometer"] = currentActivity.accelMagnitude;
  doc["magnitudes"]["gyroscope"] = currentActivity.gyroMagnitude;
  doc["timestamp"] = currentActivity.timestamp;
  
  String message;
  serializeJson(doc, message);
  
  // Enviar como evento de Socket.IO
  String socketIOMessage = "42[\"activity-state\"," + message + "]";
  client.send(socketIOMessage);
}

void sendGPSData() {
  if (!client.available()) return;
  
  // Simular pequeño movimiento para demo
  latitude += (random(-10, 11) / 10000.0);
  longitude += (random(-10, 11) / 10000.0);
  
  // Crear JSON con datos GPS
  StaticJsonDocument<256> doc;
  doc["petId"] = PET_ID;
  doc["deviceId"] = "ESP32C6_MAX";
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  doc["altitude"] = 150.0 + random(-5, 6);
  doc["speed"] = random(0, 5);
  doc["heading"] = random(0, 360);
  doc["accuracy"] = 3.0 + (random(-10, 11) / 10.0);
  doc["satellites"] = random(8, 15);
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  
  // Enviar como evento de Socket.IO
  String socketIOMessage = "42[\"location-data\"," + message + "]";
  client.send(socketIOMessage);
  
  Serial.printf("📍 GPS enviado: %.6f, %.6f\n", latitude, longitude);
}

void sendBatteryData() {
  if (!client.available()) return;
  
  // Simular datos de batería
  static int batteryLevel = 100;
  batteryLevel = max(20, batteryLevel - random(0, 2)); // Descarga lenta
  
  // Crear JSON con datos de batería
  StaticJsonDocument<256> doc;
  doc["petId"] = PET_ID;
  doc["deviceId"] = "ESP32C6_MAX";
  doc["voltage"] = 3.7 + (batteryLevel / 100.0) * 0.5;
  doc["percentage"] = batteryLevel;
  doc["charging"] = false;
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  
  // Enviar como evento de Socket.IO
  String socketIOMessage = "42[\"battery-data\"," + message + "]";
  client.send(socketIOMessage);
  
  Serial.printf("🔋 Batería: %d%%\n", batteryLevel);
}
