# Backend Local No Usado

Este archivo server.js NO se usa porque el proyecto está configurado para Railway.

- ESP32C6 se conecta directamente a: pet-tracker-production.up.railway.app
- Frontend se conecta a: wss://pet-tracker-production.up.railway.app/ws
- Este backend local puede causar confusión si se ejecuta

Para usar Railway, los datos fluyen:
ESP32C6 → Railway → Frontend

Si quieres usar backend local, cambia:
1. ESP32C6: ws_host a tu IP local
2. Frontend environments: wsUrl a ws://localhost:3000/ws

