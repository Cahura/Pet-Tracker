# 🛠️ SOLUCIÓN: Error de Subida ESP32-C6

## ❌ **Problema Identificado:**
```
A fatal error occurred: Serial data stream stopped: Possible serial noise or corruption.
Failed uploading: uploading error: exit status 2
```

## ✅ **SOLUCIÓN PASO A PASO:**

### **Método 1: Boot Manual (MÁS EFECTIVO)**

1. **Desconecta** el ESP32-C6 del USB
2. **Mantén presionado** el botón **BOOT** (GPIO9)
3. **Conecta** el USB mientras mantienes BOOT presionado
4. **Suelta** el botón BOOT después de 2 segundos
5. **Sube el código** inmediatamente

### **Método 2: Configuración Arduino IDE Optimizada**

Cambia estas configuraciones en Arduino IDE:

```
Placa: ESP32C6 Dev Module
Upload Speed: 115200 → 921600 (CAMBIAR A MÁS RÁPIDO)
CPU Frequency: 160MHz
Flash Mode: QIO → DIO (CAMBIAR)
Flash Size: 4MB (32Mb)
Partition Scheme: Huge APP (3MB No OTA/1MB SPIFFS)
Core Debug Level: None
Erase All Flash Before Sketch Upload: Enabled → Disabled (CAMBIAR)
```

### **Método 3: Usar esptool.py Directo**

Si el Arduino IDE sigue fallando, usa esptool directamente:

```bash
# 1. Compilar en Arduino IDE (Sketch → Export compiled Binary)
# 2. Ejecutar en terminal:
esptool.py --chip esp32c6 --port COM8 --baud 460800 write_flash 0x0 ESP32_PetTracker_v3.ino.bin
```

### **Método 4: Cable USB y Puerto**

1. **Cambia el cable USB** - muchos cables solo son de carga
2. **Prueba otro puerto USB** (preferible USB 2.0)
3. **Desconecta otros dispositivos** del USB
4. **Reinicia** el Arduino IDE

### **Método 5: Drivers y Sistema**

1. **Actualiza los drivers** CH340/CP2102:
   - Descarga desde: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
2. **Cierra** programas que usen COM8 (monitor serial, etc.)
3. **Ejecuta Arduino IDE como administrador**

## 🚀 **PROCEDIMIENTO RECOMENDADO:**

1. **Cierra** Arduino IDE
2. **Desconecta** ESP32-C6
3. **Cambia Upload Speed a 921600**
4. **Cambia Flash Mode a DIO**
5. **Deshabilita** "Erase All Flash"
6. **Conecta** ESP32-C6
7. **Mantén BOOT presionado** y **presiona RESET**
8. **Suelta RESET**, luego **suelta BOOT**
9. **Sube el código** inmediatamente

## 📊 **Estado Actual del Código:**
- ✅ Tamaño: 1.1MB (85%) - **ACEPTABLE**
- ✅ RAM: 43KB (13%) - **EXCELENTE**
- ❌ Error de subida - **PROBLEMA DE COMUNICACIÓN SERIAL**

## ⚡ **Si Todo Falla - Código Reducido:**

Te puedo crear una versión ultra-compacta si es necesario, pero el problema es de comunicación, no de tamaño.
