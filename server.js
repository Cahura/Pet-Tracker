const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Crear servidor HTTP
const server = http.createServer(app);

// Configurar middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'frontend/dist/pet-tracker')));
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

// Ruta de healthcheck para Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'pet-tracker-websocket',
    version: '2.0.0'
  });
});

// Ruta raíz - servir la aplicación Angular o mensaje de estado
app.get('/', (req, res) => {
  const frontendPath = path.join(__dirname, 'frontend/dist/pet-tracker/index.html');
  
  // Verificar si el frontend está disponible
  if (fs.existsSync(frontendPath)) {
    res.sendFile(frontendPath);
  } else {
    // Si el frontend no está disponible, mostrar estado del servidor
    res.status(200).json({
      status: 'Pet Tracker Server Running',
      message: 'WebSocket server is active',
      websocket: '/ws',
      health: '/health',
      timestamp: new Date().toISOString(),
      frontend: 'Building or not available'
    });
  }
});

// Capturar todas las rutas para SPA (Single Page Application)
app.get('*', (req, res) => {
  const frontendPath = path.join(__dirname, 'frontend/dist/pet-tracker/index.html');
  
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

// Función para broadcast a todos los clientes
function broadcastToClients(data) {
  const message = JSON.stringify(data);
  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
      } catch (error) {
        console.error('Error sending to client:', error);
        connections.delete(ws);
      }
    }
  });
}

// Configuración del servidor WebSocket
wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  console.log(`🔗 Nueva conexión WebSocket desde: ${clientIP}`);
  
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

  // Manejar mensajes recibidos
  ws.on('message', (data) => {
    try {
      const parsedData = JSON.parse(data.toString());
      console.log('📨 Mensaje recibido:', parsedData);

      // Detectar si es un mensaje del ESP32C6
      if (parsedData.deviceId && parsedData.deviceId.includes('ESP32C6')) {
        console.log('🎯 Datos del ESP32C6 recibidos');
        lastESP32Data = {
          ...parsedData,
          timestamp: Date.now(),
          receivedAt: new Date().toISOString()
        };
        
        if (!esp32Connected) {
          esp32Connected = true;
          console.log('🟢 ESP32C6 conectado');
        }

        // Reenviar a todos los clientes conectados
        broadcastToClients(lastESP32Data);
      } else {
        // Reenviar mensaje a otros clientes (comunicación entre clientes)
        broadcastToClients(parsedData);
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);
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

// Monitoreo de ESP32C6 - marcar como desconectado si no hay datos
setInterval(() => {
  if (esp32Connected && lastESP32Data) {
    const timeSinceLastData = Date.now() - lastESP32Data.timestamp;
    const timeoutMs = 60000; // 60 segundos

    if (timeSinceLastData > timeoutMs) {
      esp32Connected = false;
      console.log('🔴 ESP32C6 marcado como desconectado por timeout');
      
      // Notificar a todos los clientes que ESP32C6 se desconectó
      broadcastToClients({
        type: 'esp32_disconnected',
        timestamp: Date.now(),
        reason: 'timeout'
      });
    }
  }
}, 30000); // Verificar cada 30 segundos

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ==========================================');
  console.log('🐾 Pet Tracker WebSocket Server Railway');
  console.log('🚀 ==========================================');
  console.log(`📡 Servidor HTTP corriendo en puerto: ${PORT}`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Frontend: http://localhost:${PORT}/`);
  console.log('✅ Servidor listo para recibir conexiones');
  console.log('🚀 ==========================================');
});

// Manejo graceful de cierre
process.on('SIGTERM', () => {
  console.log('🛑 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Cerrando servidor (CTRL+C)...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});
