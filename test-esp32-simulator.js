// Simulador de ESP32C6 para pruebas
const WebSocket = require('ws');

// Configuración
const WS_URL = 'ws://localhost:3000/ws';
const SEND_INTERVAL = 5000; // Enviar cada 5 segundos

let ws;
let activityIndex = 0;
const activities = ['resting', 'walking', 'running', 'traveling'];

function connect() {
    console.log('🔄 Conectando al servidor WebSocket...');
    ws = new WebSocket(WS_URL);

    ws.on('open', () => {
        console.log('✅ Conectado al servidor WebSocket');
        startSendingData();
    });

    ws.on('close', () => {
        console.log('❌ Conexión cerrada, reintentando en 5 segundos...');
        setTimeout(connect, 5000);
    });

    ws.on('error', (error) => {
        console.error('❌ Error de WebSocket:', error.message);
    });
}

function startSendingData() {
    setInterval(() => {
        const now = Date.now();
        
        // Simular datos del ESP32C6
        const data = {
            petId: 1,
            deviceId: "ESP32C6_001", // Agregar deviceId requerido
            timestamp: now,
            coordinates: [-76.96358 + (Math.random() - 0.5) * 0.001, -12.10426 + (Math.random() - 0.5) * 0.001],
            accelerometer: {
                x: Math.random() * 20 - 10,
                y: Math.random() * 20 - 10,
                z: Math.random() * 20 - 10
            },
            gyroscope: {
                x: Math.random() * 5 - 2.5,
                y: Math.random() * 5 - 2.5,
                z: Math.random() * 5 - 2.5
            },
            temperature: 25.5,
            activity: activities[activityIndex],
            imu_magnitude: Math.random() * 15 + 5,
            wifi_rssi: -Math.random() * 50 - 30,
            connectionStatus: 'connected'
        };

        // Cambiar actividad cada 20 segundos
        if (Math.random() < 0.3) {
            activityIndex = (activityIndex + 1) % activities.length;
        }

        ws.send(JSON.stringify(data));
        console.log(`📤 Datos enviados: Activity=${data.activity}, IMU=${data.imu_magnitude.toFixed(2)}`);
    }, SEND_INTERVAL);
}

// Iniciar conexión
console.log('🚀 Iniciando simulador de ESP32C6...');
connect();

// Manejar cierre graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando simulador...');
    if (ws) {
        ws.close();
    }
    process.exit(0);
});
