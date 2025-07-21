const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Función para analizar datos del IMU y determinar el estado de actividad
function analyzeIMUData(imuData) {
  const { accelerometer, gyroscope } = imuData;
  
  // Calcular magnitudes vectoriales
  const accelMagnitude = Math.sqrt(
    Math.pow(accelerometer.x, 2) + 
    Math.pow(accelerometer.y, 2) + 
    Math.pow(accelerometer.z, 2)
  );
  
  const gyroMagnitude = Math.sqrt(
    Math.pow(gyroscope.x, 2) + 
    Math.pow(gyroscope.y, 2) + 
    Math.pow(gyroscope.z, 2)
  );

  // Umbrales para determinar actividad (ajustables según calibración)
  const thresholds = {
    lying: { accel: 9.5, gyro: 0.3 },     // Quieto/acostado
    standing: { accel: 10.5, gyro: 1.0 }, // De pie/parado
    walking: { accel: 12.0, gyro: 2.5 },  // Caminando
    running: { accel: 15.0, gyro: 4.0 }   // Corriendo
  };

  // Determinar estado basado en magnitudes
  let state = 'lying';
  let confidence = 0.0;

  if (accelMagnitude >= thresholds.running.accel && gyroMagnitude >= thresholds.running.gyro) {
    state = 'running';
    confidence = Math.min(0.95, (accelMagnitude + gyroMagnitude) / 20);
  } else if (accelMagnitude >= thresholds.walking.accel && gyroMagnitude >= thresholds.walking.gyro) {
    state = 'walking';
    confidence = Math.min(0.90, (accelMagnitude + gyroMagnitude) / 15);
  } else if (accelMagnitude >= thresholds.standing.accel && gyroMagnitude >= thresholds.standing.gyro) {
    state = 'standing';
    confidence = Math.min(0.85, (accelMagnitude + gyroMagnitude) / 12);
  } else {
    state = 'lying';
    confidence = Math.max(0.70, 1 - ((accelMagnitude + gyroMagnitude) / 15));
  }

  console.log(`📊 IMU Analysis - Accel: ${accelMagnitude.toFixed(2)}, Gyro: ${gyroMagnitude.toFixed(2)}, State: ${state}, Confidence: ${(confidence * 100).toFixed(1)}%`);

  return {
    state,
    confidence,
    magnitudes: {
      accelerometer: accelMagnitude,
      gyroscope: gyroMagnitude
    },
    rawData: {
      accelerometer,
      gyroscope
    }
  };
}

// Función para validar datos de entrada
function validatePetData(data) {
  return data && 
         typeof data.petId === 'number' &&
         typeof data.deviceId === 'string' &&
         data.accelerometer && 
         data.gyroscope &&
         typeof data.accelerometer.x === 'number' &&
         typeof data.accelerometer.y === 'number' &&
         typeof data.accelerometer.z === 'number' &&
         typeof data.gyroscope.x === 'number' &&
         typeof data.gyroscope.y === 'number' &&
         typeof data.gyroscope.z === 'number';
}

// Configuración del servidor
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
  server, 
  path: '/ws',
  clientTracking: true,
  perMessageDeflate: false
});

// Set para mantener conexiones activas
let connectedClients = new Set();

// Configuración de middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connectedClients: connectedClients.size,
    uptime: process.uptime()
  });
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const clientId = req.socket.remoteAddress + ':' + req.socket.remotePort;
  connectedClients.add(ws);
  
  console.log(`🟢 Cliente WebSocket conectado desde ${clientId}. Total: ${connectedClients.size}`);

  // Heartbeat para mantener conexión activa
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Print detallado de datos recibidos
      console.log('\n📨 ===== DATOS RECIBIDOS DEL ESP32C6 =====');
      console.log(`🕒 Timestamp: ${new Date().toLocaleTimeString()}`);
      console.log(`🏷️  Device ID: ${data.deviceId}`);
      console.log(`🐕 Pet ID: ${data.petId}`);
      console.log(`🎭 Actividad: ${data.activity || 'NO DEFINIDA'}`);
      console.log(`📈 Confianza: ${data.activity_confidence ? (data.activity_confidence * 100).toFixed(1) + '%' : 'N/A'}`);
      console.log(`💪 Intensidad: ${data.movement_intensity !== undefined ? data.movement_intensity + '%' : 'N/A'}`);
      console.log(`🧍 Postura: ${data.posture || 'N/A'}`);
      console.log(`📍 GPS válido: ${data.gps_valid ? 'SÍ' : 'NO'}`);
      if (data.gps_valid && data.latitude && data.longitude) {
        console.log(`🌍 Coordenadas: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`);
        console.log(`🏃 Velocidad: ${data.gps_speed_kmh ? data.gps_speed_kmh.toFixed(1) + ' km/h' : 'N/A'}`);
      }
      console.log('==========================================\n');
      
      // Validar datos recibidos
      if (!validatePetData(data)) {
        console.warn('⚠️ VALIDACIÓN FALLIDA - Datos inválidos recibidos:', data);
        return;
      }

      // El ESP32C6 ya procesa toda la actividad - el backend solo retransmite
      let processedData = { ...data };

      // Solo usar análisis del backend si el ESP32C6 no envió actividad procesada
      if (!data.activity && data.accelerometer && data.gyroscope) {
        console.log('⚠️ Datos sin actividad procesada - usando análisis de respaldo del backend');
        const imuAnalysis = analyzeIMUData(data);
        processedData.activity = imuAnalysis.state;
        processedData.activityConfidence = imuAnalysis.confidence;
        processedData.imuMagnitudes = imuAnalysis.magnitudes;
      } else if (data.activity) {
        // Usar datos ya procesados del ESP32C6
        console.log(`✅ USANDO ACTIVIDAD DEL ESP32C6: ${data.activity} (confianza: ${data.activity_confidence ? (data.activity_confidence * 100).toFixed(1) + '%' : 'N/A'})`);
      }

      // Manejar coordenadas GPS para Max (petId: 1)
      if (data.petId === 1) {
        if (data.gps_valid && data.latitude && data.longitude) {
          // Usar coordenadas GPS reales del ESP32 cuando estén disponibles
          processedData.latitude = data.latitude;
          processedData.longitude = data.longitude;
          processedData.coordinates = [data.longitude, data.latitude];
          console.log(`📍 GPS VÁLIDO para Max: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`);
          console.log(`📊 Calidad GPS: satélites=${data.gps_satellites || 'N/A'}, hdop=${data.gps_hdop || 'N/A'}`);
          
          // Agregar información adicional de GPS
          if (data.gps_satellites) processedData.gps_satellites = data.gps_satellites;
          if (data.gps_hdop) processedData.gps_hdop = data.gps_hdop;
          if (data.gps_speed_kmh) processedData.gps_speed_kmh = data.gps_speed_kmh;
          
        } else {
          // Usar coordenadas fijas de UPC Monterrico cuando no hay GPS válido
          processedData.latitude = -12.10426;
          processedData.longitude = -76.96358;
          processedData.coordinates = [-76.96358, -12.10426];
          console.log(`📍 Usando coordenadas FIJAS para Max (GPS no válido)`);
          console.log(`   Razón: gps_valid=${data.gps_valid}, lat=${data.latitude}, lng=${data.longitude}`);
        }
      } else if (data.latitude !== undefined && data.longitude !== undefined) {
        // Para otras mascotas, normalizar coordinates
        processedData.coordinates = [data.longitude, data.latitude];
      }

      // Agregar timestamp del servidor si no existe
      if (!processedData.timestamp) {
        processedData.timestamp = Date.now();
      }

      const messageToSend = JSON.stringify(processedData);

      // Print antes de enviar a clientes
      console.log('📤 ===== ENVIANDO A CLIENTES WEB =====');
      console.log(`🎭 Actividad final: ${processedData.activity}`);
      console.log(`📈 Confianza: ${processedData.activity_confidence ? (processedData.activity_confidence * 100).toFixed(1) + '%' : 'N/A'}`);
      console.log(`🌍 Coordenadas: ${processedData.latitude ? processedData.latitude.toFixed(6) : 'N/A'}, ${processedData.longitude ? processedData.longitude.toFixed(6) : 'N/A'}`);

      // Reenviar a todos los clientes conectados (excepto el que envió)
      let clientsSent = 0;
      connectedClients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          try {
            client.send(messageToSend);
            clientsSent++;
          } catch (error) {
            console.error('❌ Error enviando mensaje a cliente:', error);
            connectedClients.delete(client);
          }
        }
      });

      console.log(`✅ DATOS ENVIADOS A ${clientsSent} CLIENTE(S) WEB`);
      console.log('=====================================\n');

    } catch (error) {
      console.error('❌ Error procesando mensaje WebSocket:', error);
    }
  });

  ws.on('close', (code, reason) => {
    connectedClients.delete(ws);
    console.log(`🔴 Cliente WebSocket desconectado (${code}: ${reason}). Total: ${connectedClients.size}`);
  });

  ws.on('error', (error) => {
    console.error('❌ Error en WebSocket:', error);
    connectedClients.delete(ws);
  });
});

// Heartbeat para detectar conexiones muertas
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log('💔 Terminando conexión inactiva');
      connectedClients.delete(ws);
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Cada 30 segundos

// Limpiar interval al cerrar servidor
wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Servir frontend en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Pet Tracker Backend WebSocket Server`);
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🌐 WebSocket endpoint: /ws`);
  console.log(`💚 Health check: /health`);
  console.log(`📊 Modo: ${process.env.NODE_ENV || 'development'}`);
});