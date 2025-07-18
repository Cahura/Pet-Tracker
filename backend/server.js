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

const express = require('express');

const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

let clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  ws.on('message', (message) => {
    let fixedMessage = message;
    try {
      const data = JSON.parse(message);
      // Si es Max (petId: 1), fijar coordenadas
      if (data.petId === 1) {
        data.latitude = -12.10426;
        data.longitude = -76.96358;
        // Si usa 'coordinates' también
        data.coordinates = [-76.96358, -12.10426];
        fixedMessage = JSON.stringify(data);
      }
    } catch (e) {
      // Si no es JSON, no modificar
    }
    // Reenviar a todos los clientes (excepto el que envió)
    for (let client of clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(fixedMessage);
      }
    }
  });
  ws.on('close', () => clients.delete(ws));
});

const PORT = process.env.PORT || 3000;
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Servir frontend en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend WebSocket puro en Railway puerto ${PORT}`);
});