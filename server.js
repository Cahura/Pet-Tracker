const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// Crear servidor HTTP
const server = http.createServer(app);

// Crear servidor WebSocket
const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

// Servir archivos estáticos de Angular
app.use(express.static(path.join(__dirname, 'frontend/dist/pet-tracker/browser')));

// Manejar rutas de Angular (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/pet-tracker/browser/index.html'));
});

// Manejar conexiones WebSocket
wss.on('connection', (ws, req) => {
  console.log('🟢 Nueva conexión WebSocket establecida');
  
  // Enviar mensaje de bienvenida
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Conectado a Pet Tracker Railway WebSocket',
    timestamp: Date.now()
  }));

  // Manejar mensajes recibidos (del ESP32C6)
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Mensaje recibido del ESP32C6:', message);
      
      // Manejar diferentes tipos de mensajes
      if (message.type === 'route_data') {
        console.log('📍 Datos de ruta recibidos del ESP32C6:');
        console.log(`   - Puntos: ${message.pointCount}`);
        console.log(`   - Pet ID: ${message.petId}`);
        
        // Reenviar datos de ruta a todos los frontends
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data.toString());
          }
        });
        
      } else {
        // Datos normales de ubicación/IMU
        // Reenviar a todos los clientes conectados (frontend)
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data.toString());
          }
        });
        
        // Log detallado para debugging
        if (message.latitude && message.longitude) {
          console.log(`📍 GPS: ${message.latitude}, ${message.longitude}`);
          console.log(`🌍 Ubicación: https://www.google.com/maps?q=${message.latitude},${message.longitude}`);
          
          // Log información de movimiento si está disponible
          if (message.gps_speed_kmh) {
            console.log(`🏃 Velocidad: ${message.gps_speed_kmh} km/h`);
          }
          if (message.activity) {
            console.log(`🎯 Actividad: ${message.activity}`);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error parseando mensaje:', error);
    }
  });

  // Manejar desconexión
  ws.on('close', () => {
    console.log('🔴 Conexión WebSocket cerrada');
  });

  // Manejar errores
  ws.on('error', (error) => {
    console.error('❌ Error WebSocket:', error);
  });
});

// Manejar errores del servidor WebSocket
wss.on('error', (error) => {
  console.error('❌ Error del servidor WebSocket:', error);
});

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`📡 Railway WebSocket: wss://pet-tracker-production.up.railway.app/ws`);
});

// Heartbeat para mantener conexiones activas
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 30000);

// Log de estado cada minuto
setInterval(() => {
  console.log(`📊 Estado servidor: ${wss.clients.size} clientes conectados`);
}, 60000);
