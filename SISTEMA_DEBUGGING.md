# 🐕 Sistema de Debugging ESP32C6 Pet Tracker

## 📋 Resumen de Prints Implementados

He agregado prints detallados en **toda la cadena de datos** para que puedas verificar exactamente cómo fluye el estado de actividad desde el ESP32C6 hasta la página web.

## 🔧 1. ESP32C6 - Prints en el Monitor Serie

### 📊 Análisis de Actividad
```
==================================================
🕒 TIMESTAMP: 45623 ms (45 seg)
🎯 ACTIVIDAD DETECTADA: walking
📊 MÉTRICAS DETALLADAS:
   - Acelerómetro promedio: 13.24 m/s²
   - Giroscopio promedio: 3.15 rad/s
   - Velocidad GPS: 1.20 m/s (4.32 km/h)
   - Componente Z: 9.81 m/s²
   - GPS válido: SÍ
==================================================
```

### 📤 Envío de Datos
```
📤 ENVIANDO DATOS AL BACKEND:
   🏷️  Device ID: ESP32C6_MAX
   🎭 Actividad: walking
   📈 Confianza: 85.3%
   💪 Intensidad: 65%
   🧍 Postura: upright
   📍 GPS: VÁLIDO
   🌍 Coordenadas: -12.104260, -76.963580
   📡 JSON completo: {"petId":1,"deviceId":"ESP32C6_MAX"...}
==========================================
✅ DATOS ENVIADOS EXITOSAMENTE AL BACKEND
```

## 🖥️ 2. Backend Node.js - Logs del Servidor

### 📨 Recepción de Datos
```
📨 ===== DATOS RECIBIDOS DEL ESP32C6 =====
🕒 Timestamp: 14:32:15
🏷️  Device ID: ESP32C6_MAX
🐕 Pet ID: 1
🎭 Actividad: walking
📈 Confianza: 85.3%
💪 Intensidad: 65%
🧍 Postura: upright
📍 GPS válido: SÍ
🌍 Coordenadas: -12.104260, -76.963580
🏃 Velocidad: 4.3 km/h
==========================================

✅ USANDO ACTIVIDAD DEL ESP32C6: walking (confianza: 85.3%)
```

### 📤 Envío a Clientes Web
```
📤 ===== ENVIANDO A CLIENTES WEB =====
🎭 Actividad final: walking
📈 Confianza: 85.3%
🌍 Coordenadas: -12.104260, -76.963580
✅ DATOS ENVIADOS A 1 CLIENTE(S) WEB
=====================================
```

## 🌐 3. Frontend Angular - Console del Navegador

### 🔔 Recepción en la Página Web
```
🔔 ===== DATOS RECIBIDOS EN FRONTEND =====
🕒 Timestamp: 14:32:15
🏷️  Device ID: ESP32C6_MAX
🎭 Actividad recibida: walking
📈 Confianza: 85.3%
💪 Intensidad: 65%
🧍 Postura: upright
📍 GPS válido: SÍ
🌍 Coordenadas: -12.104260, -76.963580
🏃 Velocidad: 4.3 km/h
=========================================
```

### 🔄 Actualización Visual del Mapa
```
🔄 ===== ACTUALIZANDO ACTIVIDAD EN MAPA =====
🎭 Actividad a aplicar: walking
📈 Confianza: 85.3%
💪 Intensidad: 65%
🏷️  Marcador encontrado para: Max
🔄 Estado actual del marcador: resting
🎯 Nuevo estado a aplicar: walking
✅ ESTADO VISUAL ACTUALIZADO: resting → walking
🔄 Estado en servicio actualizado: walking
🎨 Animación de cambio activada para: walking
==========================================
```

## 🔍 Cómo Usar el Sistema de Debugging

### **Paso 1: Monitorear ESP32C6**
1. Abre Arduino IDE
2. Selecciona el puerto de tu ESP32C6
3. Abre el Monitor Serie (115200 baud)
4. Verás los prints detallados cada 8 segundos

### **Paso 2: Monitorear Backend**
1. Ejecuta `cd backend && npm start`
2. Observa la terminal donde se ejecuta
3. Verás los logs cuando reciba datos del ESP32C6

### **Paso 3: Monitorear Frontend**
1. Abre `http://localhost:3000` en tu navegador
2. Abre las Herramientas de Desarrollador (F12)
3. Ve a la pestaña "Console"
4. Verás los logs cuando la página reciba los datos

## 🎯 Verificación del Flujo Completo

### ✅ Estado de Actividad Correcto
Si todo funciona bien, deberías ver la **misma actividad** en:

1. **ESP32C6**: `🎯 ACTIVIDAD DETECTADA: walking`
2. **Backend**: `🎭 Actividad: walking`
3. **Frontend**: `🎭 Actividad recibida: walking`
4. **Mapa Visual**: `✅ ESTADO VISUAL ACTUALIZADO: ... → walking`

### ❌ Detección de Problemas

Si los estados no coinciden, revisa:

**ESP32C6 no envía datos:**
- ❌ WiFi no conectado
- ❌ WebSocket desconectado
- ❌ IMU no funciona

**Backend no recibe:**
- ❌ Puerto 3000 ocupado
- ❌ Validación de datos falla

**Frontend no actualiza:**
- ❌ WebSocket del navegador desconectado
- ❌ Datos no pasan validación TypeScript

## 📊 Actividades Detectables

El sistema ahora detecta **8 tipos de actividad**:

1. **lying** - Acostado/durmiendo
2. **sitting** - Sentado
3. **standing** - Parado
4. **resting** - Descansando general
5. **walking** - Caminando
6. **running** - Corriendo
7. **playing** - Jugando (movimientos erráticos)
8. **traveling** - En transporte/vehículo

## 🚀 Ejemplo de Flujo Completo

```
[ESP32C6] 🎯 ACTIVIDAD DETECTADA: playing
           ↓
[ESP32C6] 📤 ENVIANDO: {"activity":"playing","confidence":0.82...}
           ↓
[Backend] 📨 RECIBIDO: playing (confianza: 82%)
           ↓
[Backend] 📤 ENVIANDO A CLIENTES: playing
           ↓
[Frontend] 🔔 RECIBIDO: playing
           ↓
[Frontend] ✅ MAPA ACTUALIZADO: standing → playing
```

## 🎮 Cómo Probar

1. **Configura WiFi** en el ESP32C6
2. **Sube el código** al ESP32C6
3. **Ejecuta backend**: `npm start`
4. **Abre navegador**: `http://localhost:3000`
5. **Mueve el ESP32C6** y observa:
   - Monitor Serie: Actividad detectada
   - Terminal Backend: Datos recibidos/enviados
   - Console Navegador: Actualizaciones visuales
   - Mapa: Cambio de estado en tiempo real

¡Ahora puedes verificar paso a paso que el estado de actividad se transmite correctamente desde el sensor hasta la interfaz web! 🎯
