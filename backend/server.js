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
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configuración CORS para Railway
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:4200",
      "https://pet-tracker-frontend.vercel.app",
      "https://pet-tracker-*.vercel.app",
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    "http://localhost:4200",
    "https://pet-tracker-frontend.vercel.app",
    "https://pet-tracker-*.vercel.app",
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

app.use(express.json());

// Servir archivos estáticos del frontend en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Manejar rutas de Angular (SPA routing)
  app.get('*', (req, res, next) => {
    // Skip API routes and health check
    if (req.path.startsWith('/health') || req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// Endpoint de salud para Railway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connectedClients: io.engine.clientsCount
  });
});

// Almacenamiento temporal de datos de mascotas
let petsData = new Map();

// Conexiones Socket.IO
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id} - ${new Date().toLocaleString()}`);

  // Manejo de conexión de ESP32C6
  socket.on('esp32-connect', (data) => {
    console.log(`📡 ESP32C6 conectado:`, data);
    socket.join('esp32-devices');
    
    // Notificar a clientes web sobre nuevo dispositivo
    socket.broadcast.emit('device-connected', {
      deviceId: data.deviceId,
      petId: data.petId,
      timestamp: new Date().toISOString()
    });
  });

  // Recibir datos GPS del ESP32C6
  socket.on('gps-data', (data) => {
    console.log(`📍 Datos GPS recibidos:`, data);
    
    // Validar datos GPS
    if (data.latitude && data.longitude && data.petId) {
      // Almacenar datos temporalmente
      petsData.set(data.petId, {
        ...data,
        timestamp: new Date().toISOString(),
        deviceId: socket.id
      });

      // Enviar a todos los clientes web
      socket.broadcast.emit('pet-location-update', {
        petId: data.petId,
        coordinates: [data.longitude, data.latitude],
        battery: data.battery || 100,
        timestamp: new Date().toISOString(),
        accuracy: data.accuracy || 5,
        speed: data.speed || 0,
        activity: data.activity || 'unknown'
      });
    }
  });

  // Recibir datos del IMU (acelerómetro y giroscopio)
  socket.on('imu-data', (data) => {
    console.log(`🔄 Datos IMU recibidos:`, data);
    
    if (data.petId && data.accelerometer && data.gyroscope) {
      // Procesar datos del IMU para determinar actividad
      const activityState = analyzeIMUData(data);
      
      // Almacenar datos temporalmente
      const petData = petsData.get(data.petId) || {};
      petData.imuData = {
        accelerometer: data.accelerometer,
        gyroscope: data.gyroscope,
        temperature: data.temperature,
        activityState: activityState,
        timestamp: new Date().toISOString()
      };
      petsData.set(data.petId, petData);

      // Enviar datos procesados a todos los clientes web
      socket.broadcast.emit('pet-imu-update', {
        petId: data.petId,
        imuData: petData.imuData,
        activityState: activityState,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Recibir estado de actividad procesado del ESP32C6
  socket.on('activity-state', (data) => {
    console.log(`🐕 Estado de actividad recibido:`, data);
    
    // Validar datos de actividad
    if (data.petId && data.state) {
      // Almacenar estado temporalmente
      const petData = petsData.get(data.petId) || {};
      petData.activityState = data.state;
      petData.confidence = data.confidence || 0.8;
      petData.timestamp = new Date().toISOString();
      petsData.set(data.petId, petData);

      // Enviar a todos los clientes web
      socket.broadcast.emit('pet-activity-update', {
        petId: data.petId,
        activityState: data.state,
        confidence: data.confidence,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Recibir datos de batería del ESP32C6
  socket.on('battery-data', (data) => {
    console.log(`🔋 Datos de batería recibidos:`, data);
    
    if (data.petId && data.batteryLevel !== undefined) {
      // Almacenar datos temporalmente
      const petData = petsData.get(data.petId) || {};
      petData.batteryLevel = data.batteryLevel;
      petData.timestamp = new Date().toISOString();
      petsData.set(data.petId, petData);

      // Enviar a todos los clientes web
      socket.broadcast.emit('pet-battery-update', {
        petId: data.petId,
        batteryLevel: data.batteryLevel,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Comando desde frontend para iniciar tracking
  socket.on('start-tracking', (data) => {
    console.log(`▶️ Iniciar tracking para mascota ${data.petId}`);
    
    // Enviar comando a ESP32C6
    socket.to('esp32-devices').emit('startTracking', {
      petId: data.petId,
      interval: data.interval || 5000, // 5 segundos por defecto
      minDistance: data.minDistance || 10 // 10 metros por defecto
    });

    // Confirmar a frontend
    socket.emit('tracking-started', {
      petId: data.petId,
      timestamp: new Date().toISOString()
    });
  });

  // Comando desde frontend para detener tracking
  socket.on('stop-tracking', (data) => {
    console.log(`⏹️ Detener tracking para mascota ${data.petId}`);
    
    // Enviar comando a ESP32C6
    socket.to('esp32-devices').emit('stopTracking', {
      petId: data.petId
    });

    // Confirmar a frontend
    socket.emit('tracking-stopped', {
      petId: data.petId,
      timestamp: new Date().toISOString()
    });
  });

  // Solicitar datos actuales de mascotas
  socket.on('get-pets-data', () => {
    const allPetsData = Array.from(petsData.entries()).map(([petId, data]) => ({
      petId,
      ...data
    }));
    
    socket.emit('pets-data', allPetsData);
  });

  // Configurar zona segura
  socket.on('configure-safe-zone', (data) => {
    console.log(`🛡️ Configurar zona segura:`, data);
    
    // Enviar configuración a ESP32C6
    socket.to('esp32-devices').emit('configureSafeZone', {
      petId: data.petId,
      center: data.center,
      radius: data.radius
    });

    // Confirmar a frontend
    socket.emit('safe-zone-configured', {
      petId: data.petId,
      timestamp: new Date().toISOString()
    });
  });

  // Alerta de zona segura
  socket.on('safe-zone-alert', (data) => {
    console.log(`🚨 Alerta zona segura:`, data);
    
    // Enviar alerta a todos los clientes web
    io.emit('safe-zone-violation', {
      petId: data.petId,
      coordinates: [data.longitude, data.latitude],
      distance: data.distance,
      timestamp: new Date().toISOString()
    });
  });

  // Manejo de desconexión
  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id} - ${new Date().toLocaleString()}`);
    
    // Limpiar datos si era un ESP32C6
    for (let [petId, data] of petsData.entries()) {
      if (data.deviceId === socket.id) {
        petsData.delete(petId);
        socket.broadcast.emit('device-disconnected', { petId });
      }
    }
  });

  // Manejo de errores
  socket.on('error', (error) => {
    console.error(`❌ Error en socket ${socket.id}:`, error);
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Pet Tracker Backend iniciado en puerto ${PORT}`);
  console.log(`🌐 Servidor Socket.IO listo para conexiones`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Manejo de errores del servidor
server.on('error', (error) => {
  console.error('❌ Error del servidor:', error);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('🛑 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

module.exports = { app, server, io };
