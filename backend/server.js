const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
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
