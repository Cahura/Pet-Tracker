#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// CONFIGURACIÓN WiFi - CAMBIAR POR TUS CREDENCIALES REALES
// ============================================================================

// 🏠 CONFIGURACIÓN PARA CASA/OFICINA
const char* WIFI_SSID = "TU_RED_WIFI_AQUI";        // ⚠️ CAMBIAR: Nombre de tu red WiFi
const char* WIFI_PASSWORD = "TU_PASSWORD_AQUI";     // ⚠️ CAMBIAR: Contraseña de tu WiFi

// 🏢 CONFIGURACIONES ALTERNATIVAS (descomenta la que uses)
/*
// Para red móvil compartida:
const char* WIFI_SSID = "iPhone de Carlos";
const char* WIFI_PASSWORD = "12345678";

// Para oficina:
const char* WIFI_SSID = "OfficeSecurity";
const char* WIFI_PASSWORD = "empresa123";

// Para casa con 5GHz (recomendado para mejor alcance):
const char* WIFI_SSID = "MiCasa_5G";
const char* WIFI_PASSWORD = "mipassword2024";
*/

// ============================================================================
// CONFIGURACIÓN Railway WebSocket (NO CAMBIAR)
// ============================================================================
const char* WS_HOST = "pet-tracker-production.up.railway.app";
const int WS_PORT = 443;
const char* WS_PATH = "/ws";

// ============================================================================
// CONFIGURACIÓN DEL DISPOSITIVO
// ============================================================================
const int PET_ID = 1;                               // ID de la mascota (Max = 1)
const char* DEVICE_ID = "ESP32C6_OPTIMIZED";        // Identificador del dispositivo
const char* PET_NAME = "Max";                       // Nombre de la mascota

// ============================================================================
// CONFIGURACIÓN DE TIEMPOS (en milisegundos)
// ============================================================================
const unsigned long SEND_INTERVAL = 8000;           // Enviar datos cada 8 segundos
const unsigned long GPS_DEBUG_INTERVAL = 15000;     // Debug GPS cada 15 segundos
const unsigned long RECONNECT_INTERVAL = 30000;     // Reconexión cada 30 segundos
const unsigned long GPS_TIMEOUT = 15000;            // Timeout para GPS válido

// ============================================================================
// CONFIGURACIÓN DE PINES ESP32C6
// ============================================================================
#define SDA_PIN 6          // Pin SDA para I2C (MPU6050)
#define SCL_PIN 7          // Pin SCL para I2C (MPU6050)
#define GPS_RX_PIN 4       // Pin RX para GPS
#define GPS_TX_PIN 5       // Pin TX para GPS
#define GPS_BAUDRATE 9600  // Velocidad de comunicación GPS

// ============================================================================
// CONFIGURACIÓN DE DEBUG
// ============================================================================
#define ENABLE_SERIAL_DEBUG true       // Habilitar logs por Serial
#define ENABLE_GPS_DEBUG true          // Habilitar debug detallado de GPS
#define ENABLE_WEBSOCKET_DEBUG true    // Habilitar debug de WebSocket
#define ENABLE_IMU_DEBUG false         // Habilitar debug de IMU (puede ser verboso)

#endif
