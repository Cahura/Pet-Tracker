const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
// Railway proporciona el puerto automáticamente
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RAILWAY_ENVIRONMENT = process.env.RAILWAY_ENVIRONMENT || 'local';

// Crear servidor HTTP
const server = http.createServer(app);

console.log('🚀 ==========================================');
console.log('🐾 Pet Tracker WebSocket Server Railway');
console.log('🚀 ==========================================');
console.log(`🌍 Environment: ${NODE_ENV}`);
console.log(`🚂 Railway Environment: ${RAILWAY_ENVIRONMENT}`);
console.log(`📡 Port: ${PORT}`);
console.log('🚀 ==========================================');

// Configurar middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'frontend/dist/pet-tracker/browser')));
app.use(express.json());

// Configurar CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Ruta de healthcheck para Railway (CRÍTICA)
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'pet-tracker-websocket',
    version: '2.1.0',
    environment: NODE_ENV,
    railway: RAILWAY_ENVIRONMENT,
    websocket: {
      connections: connections.size,
      esp32Connected: esp32Connected,
      lastDataReceived: lastESP32Data ? new Date(lastESP32Data.timestamp).toISOString() : 'No data yet'
    },
    uptime: process.uptime()
  };
  
  console.log('💚 Health check - Railway status:', healthStatus);
  res.status(200).json(healthStatus);
});

// Ruta raíz - SIEMPRE servir la aplicación Angular
app.get('/', (req, res) => {
  const frontendPath = path.join(__dirname, 'frontend/dist/pet-tracker/browser/index.html');
  
  // SIEMPRE servir el frontend Angular si existe
  if (fs.existsSync(frontendPath)) {
    console.log('🌐 Sirviendo frontend Angular desde:', frontendPath);
    res.sendFile(frontendPath);
  } else {
    // Si el frontend no está construido, mostrar instrucciones
    res.status(503).json({
      status: 'Pet Tracker Server Running',
      message: 'Frontend not available - need to build Angular app',
      websocket: '/ws',
      health: '/health',
      timestamp: new Date().toISOString(),
      frontend: 'Run: npm run build to build frontend',
      instructions: 'The Angular frontend needs to be built. Run "cd frontend && npm run build" then restart server.'
    });
  }
});

// Capturar todas las rutas para SPA (Single Page Application)
app.get('*', (req, res) => {
  const frontendPath = path.join(__dirname, 'frontend/dist/pet-tracker/browser/index.html');
  
  if (fs.existsSync(frontendPath)) {
    res.sendFile(frontendPath);
  } else {
    // Redirect to home if frontend not available
    res.redirect('/');
  }
});

// Crear servidor WebSocket
const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

// Store para conexiones activas
const connections = new Set();
let lastESP32Data = null;
let esp32Connected = false;

// Función para broadcast optimizada para Railway
function broadcastToClients(data) {
  const message = JSON.stringify(data);
  let successCount = 0;
  let errorCount = 0;
  
  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
        successCount++;
      } catch (error) {
        console.error('❌ Error enviando a cliente Railway:', error);
        connections.delete(ws);
        errorCount++;
      }
    } else {
      connections.delete(ws);
      errorCount++;
    }
  });
  
  if (data.deviceId && data.deviceId.includes('ESP32')) {
    console.log(`📤 Datos ESP32C6 enviados: ✅${successCount} clientes, ❌${errorCount} errores`);
  }
}

// Configuración del servidor WebSocket optimizada para Railway
wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const isESP32 = userAgent.includes('ESP32') || clientIP.includes('ESP32');
  
  console.log('🔗 ==========================================');
  console.log(`🔗 Nueva conexión WebSocket Railway`);
  console.log(`📍 IP: ${clientIP}`);
  console.log(`🤖 User-Agent: ${userAgent}`);
  console.log(`🎯 Es ESP32C6: ${isESP32 ? 'SÍ' : 'NO'}`);
  console.log('🔗 ==========================================');
  
  connections.add(ws);
  console.log(`📊 Total conexiones activas: ${connections.size}`);

  // Enviar último dato conocido al cliente recién conectado
  if (lastESP32Data) {
    try {
      ws.send(JSON.stringify(lastESP32Data));
      console.log('📤 Enviados últimos datos ESP32C6 al nuevo cliente');
    } catch (error) {
      console.error('Error enviando datos iniciales:', error);
    }
  }

  // Enviar estado de conexión actual
  ws.send(JSON.stringify({
    type: 'connection_status',
    esp32Connected: esp32Connected,
    timestamp: Date.now()
  }));

  // Manejar mensajes recibidos (optimizado para ESP32C6)
  ws.on('message', (data) => {
    try {
      const parsedData = JSON.parse(data.toString());
      const timestamp = new Date().toISOString();
      
      console.log('📨 ==========================================');
      console.log(`📨 Mensaje recibido en Railway: ${timestamp}`);
      console.log('📊 Datos:', JSON.stringify(parsedData, null, 2));

      // Detectar si es un mensaje del ESP32C6
      if (parsedData.deviceId && (parsedData.deviceId.includes('ESP32C6') || parsedData.deviceId.includes('ESP32'))) {
        console.log('🎯 ¡DATOS DEL ESP32C6 DETECTADOS!');
        console.log(`🐾 Mascota: ${parsedData.petName || 'Desconocida'}`);
        console.log(`📍 GPS: Lat ${parsedData.latitude}, Lng ${parsedData.longitude}`);
        console.log(`⚡ IMU: X:${parsedData.accelX}, Y:${parsedData.accelY}, Z:${parsedData.accelZ}`);
        console.log(`🔋 Batería: ${parsedData.batteryLevel || 'N/A'}%`);
        
        lastESP32Data = {
          ...parsedData,
          timestamp: Date.now(),
          receivedAt: timestamp,
          serverProcessedAt: new Date().toISOString()
        };
        
        if (!esp32Connected) {
          esp32Connected = true;
          console.log('🟢 ESP32C6 CONECTADO A RAILWAY ✅');
        }

        // Reenviar a todos los clientes conectados (Angular frontend)
        console.log(`📤 Reenviando datos ESP32C6 a ${connections.size} clientes`);
        broadcastToClients(lastESP32Data);
      } else {
        console.log('📱 Mensaje de cliente web (Angular)');
        // Reenviar mensaje a otros clientes (comunicación entre clientes)
        broadcastToClients({
          ...parsedData,
          timestamp: Date.now(),
          relayedAt: timestamp
        });
      }
      console.log('📨 ==========================================');
    } catch (error) {
      console.error('❌ ==========================================');
      console.error('❌ Error procesando mensaje Railway:', error);
      console.error('❌ Datos recibidos:', data.toString());
      console.error('❌ ==========================================');
    }
  });

  // Manejar desconexión
  ws.on('close', (code, reason) => {
    connections.delete(ws);
    console.log(`🔌 Cliente desconectado (${code}): ${reason}`);
    console.log(`📊 Total conexiones activas: ${connections.size}`);
  });

  // Manejar errores
  ws.on('error', (error) => {
    console.error('❌ Error WebSocket:', error);
    connections.delete(ws);
  });
});

// Monitoreo específico de ESP32C6 para Railway
setInterval(() => {
  if (esp32Connected && lastESP32Data) {
    const timeSinceLastData = Date.now() - lastESP32Data.timestamp;
    const timeoutMs = 60000; // 60 segundos

    if (timeSinceLastData > timeoutMs) {
      esp32Connected = false;
      console.log('🔴 ==========================================');
      console.log('🔴 ESP32C6 DESCONECTADO (TIMEOUT Railway)');
      console.log(`🔴 Último dato hace: ${Math.round(timeSinceLastData/1000)} segundos`);
      console.log('🔴 ==========================================');
      
      // Notificar a todos los clientes que ESP32C6 se desconectó
      broadcastToClients({
        type: 'esp32_disconnected',
        timestamp: Date.now(),
        reason: 'timeout',
        lastSeen: lastESP32Data.receivedAt,
        serverMessage: 'ESP32C6 connection lost - Railway monitoring'
      });
    }
  } else if (!esp32Connected) {
    console.log('🟡 Railway: Esperando conexión ESP32C6...');
  }
}, 30000); // Verificar cada 30 segundos

// Iniciar servidor Railway
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ==========================================');
  console.log('🐾 Pet Tracker WebSocket Server Railway');
  console.log('🚀 ==========================================');
  console.log(`📡 Servidor HTTP Railway en puerto: ${PORT}`);
  console.log(`🔗 WebSocket endpoint: wss://[railway-domain]/ws`);
  console.log(`🏥 Health check: https://[railway-domain]/health`);
  console.log(`🌐 Frontend: https://[railway-domain]/`);
  console.log(`🎯 Esperando conexión ESP32C6...`);
  console.log('✅ Servidor Railway listo para ESP32C6 y Angular');
  console.log('🚀 ==========================================');
});

// Manejo graceful de cierre para Railway
process.on('SIGTERM', () => {
  console.log('🛑 Railway: Cerrando servidor...');
  server.close(() => {
    console.log('✅ Railway: Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Railway: Cerrando servidor (CTRL+C)...');
  server.close(() => {
    console.log('✅ Railway: Servidor cerrado correctamente');
    process.exit(0);
  });
});
