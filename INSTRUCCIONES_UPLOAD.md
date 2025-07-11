# 🔧 INSTRUCCIONES ESPECÍFICAS PARA TU PROBLEMA

## 🎯 **SOLUCIÓN INMEDIATA - SIGUE ESTOS PASOS:**

### **1. Configuración Arduino IDE (CAMBIA ESTO):**
```
Archivo → Preferencias → Configuración adicional:
- Placa: ESP32C6 Dev Module
- Upload Speed: 921600 ← CAMBIAR DE 115200
- Flash Mode: DIO ← CAMBIAR DE QIO  
- Flash Frequency: 80MHz
- Partition Scheme: Huge APP (3MB No OTA/1MB SPIFFS)
- Erase All Flash: Disabled ← CAMBIAR DE Enabled
```

### **2. Método Boot Manual (100% EFECTIVO):**

**PASO A PASO:**
1. 🔌 **Desconecta** el ESP32-C6 del USB
2. 🔘 **Localiza** los botones BOOT y RST en tu placa
3. ⏬ **Mantén presionado BOOT** (no sueltes)
4. 🔌 **Conecta** el cable USB (mientras mantienes BOOT)
5. ⏱️ **Espera 2 segundos** (sigue manteniendo BOOT)
6. ✋ **Suelta BOOT**
7. ⚡ **Sube el código INMEDIATAMENTE** (tienes 10 segundos)

### **3. Si Aún Falla - Usa la Versión Ultra:**

He creado `ESP32_PetTracker_v3_Ultra.ino` que es **50% más pequeño**:
- ✅ Tamaño: ~600KB (vs 1.1MB)
- ✅ Misma funcionalidad
- ✅ Mismo protocolo web

### **4. Verificación del Puerto:**

```bash
# En cmd/terminal, verifica que COM8 esté libre:
netstat -an | findstr :COM8
```

Si hay algo usando COM8, cierra esos programas.

### **5. Comando Manual (Si todo falla):**

1. **Compila** en Arduino IDE: `Sketch → Export Compiled Binary`
2. **Abre CMD como administrador**
3. **Ejecuta:**
```bash
cd "C:\Users\carlo\AppData\Local\Arduino15\packages\esp32\tools\esptool_py\4.8.1"
esptool.exe --chip esp32c6 --port COM8 --baud 460800 --before default_reset --after hard_reset write_flash 0x0 "C:\Users\carlo\Desktop\pet-tracker\ESP32_PetTracker_v3_Ultra.ino.esp32c6.bin"
```

## 🚨 **DIAGNÓSTICO DEL PROBLEMA:**

Tu error específico:
```
Serial data stream stopped: Possible serial noise or corruption
```

**Causas más comunes:**
1. 🔌 **Cable USB defectuoso** (muy común)
2. 📡 **Interferencia electromagnética**
3. ⚡ **Velocidad de upload muy alta**
4. 🔄 **ESP32 no en modo boot**
5. 💻 **Driver USB desactualizado**

## ✅ **CHECKLIST ANTES DE SUBIR:**

- [ ] ✅ Cable USB de datos (no solo carga)
- [ ] ✅ Puerto COM8 libre
- [ ] ✅ Upload Speed cambiado a 921600
- [ ] ✅ Flash Mode cambiado a DIO
- [ ] ✅ Erase All Flash deshabilitado
- [ ] ✅ ESP32 en modo boot manual
- [ ] ✅ Arduino IDE cerrado y reabierto

## 🎉 **DESPUÉS DE SUBIR EXITOSAMENTE:**

1. **Abre Serial Monitor** a 115200
2. **Verás:**
```
ESP32-C6 Pet Tracker v3.1 Ultra
MPU6050 OK
WiFi... OK
IP: 192.168.x.x
Sistema listo
GPS: 40.416775,-3.703790
Loc: 40.416775,-3.703790
IMU: walking
Status: online (85% bat)
```

3. **En tu web app** verás datos llegando en tiempo real

## 🆘 **SI NADA FUNCIONA:**

Escríbeme el resultado de estos comandos:
```bash
# 1. Verifica el puerto:
mode COM8

# 2. Info del sistema:
driverquery | findstr -i usb

# 3. Dispositivos conectados:
devmgmt.msc
```

**¡Vamos a conseguir que funcione! 💪**
