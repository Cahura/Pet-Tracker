import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PetData {
  petId: number;
  deviceId: string;
  timestamp: number;
  coordinates: [number, number];
  latitude?: number; // Coordenada GPS
  longitude?: number; // Coordenada GPS
  battery: number;
  activity: string; // "resting", "walking", "running", "traveling", "lying", "sitting", "standing", "playing"
  activity_confidence?: number; // Confianza en la actividad (0-1)
  movement_intensity?: number; // Intensidad de movimiento (0-100%)
  posture?: string; // Postura detectada
  accelerometer: { x: number; y: number; z: number };
  gyroscope: { x: number; y: number; z: number };
  temperature: number;
  connectionStatus?: string; // Estado de conexión del ESP32C6
  deviceActive?: boolean; // Si el dispositivo está activo
  gps_speed?: number; // Velocidad en m/s
  gps_speed_kmh?: number; // Velocidad en km/h
  gps_valid?: boolean; // Si el GPS es válido
  imu_magnitude?: number; // Magnitud del acelerómetro
  imu_average?: number; // Promedio de magnitud IMU
  gyro_average?: number; // Promedio de magnitud giroscopio
  wifi_rssi?: number; // Señal WiFi
  free_heap?: number; // Memoria disponible
  uptime_ms?: number; // Tiempo de funcionamiento
  analysis_method?: string; // Método de análisis usado
  data_quality?: string; // Calidad de los datos
  
  // Nuevos campos para manejo de rutas
  type?: string; // Tipo de mensaje: 'route_data' para rutas
  route?: RoutePoint[]; // Array de puntos de ruta
  pointCount?: number; // Número de puntos en la ruta
}

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
  speed: number;
  activity: string;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private petDataSubject = new BehaviorSubject<PetData | null>(null);
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  public petData$: Observable<PetData | null> = this.petDataSubject.asObservable();
  public connectionStatus$: Observable<boolean> = this.connectionStatusSubject.asObservable();

  constructor(private ngZone: NgZone) {
    this.connect();
  }

  private connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(environment.wsUrl);
      this.setupEventListeners();
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.ngZone.run(() => {
        console.log('🟢 WebSocket conectado a Railway');
        this.connectionStatusSubject.next(true);
        this.reconnectAttempts = 0;
      });
    };

    this.ws.onclose = (event) => {
      this.ngZone.run(() => {
        console.log('🔴 WebSocket desconectado:', event.reason);
        this.connectionStatusSubject.next(false);
        this.scheduleReconnect();
      });
    };

    this.ws.onerror = (error) => {
      console.error('❌ Error WebSocket:', error);
      this.connectionStatusSubject.next(false);
    };

    this.ws.onmessage = (event) => {
      this.ngZone.run(() => {
        this.handleMessage(event.data);
      });
    };
  }

  private handleMessage(data: string): void {
    try {
      const parsedData = JSON.parse(data);
      console.log('📨 Datos recibidos del WebSocket:', parsedData);
      
      // Normalizar datos: convertir latitude/longitude a coordinates para Mapbox
      if (parsedData.latitude !== undefined && parsedData.longitude !== undefined) {
        console.log(`🔍 COORDENADAS RECIBIDAS DETALLADAS:`);
        console.log(`   latitude RAW: ${parsedData.latitude} (tipo: ${typeof parsedData.latitude})`);
        console.log(`   longitude RAW: ${parsedData.longitude} (tipo: ${typeof parsedData.longitude})`);
        console.log(`   gps_valid: ${parsedData.gps_valid}`);
        
        // Convertir a números si son strings
        const lat = typeof parsedData.latitude === 'string' ? parseFloat(parsedData.latitude) : parsedData.latitude;
        const lng = typeof parsedData.longitude === 'string' ? parseFloat(parsedData.longitude) : parsedData.longitude;
        
        console.log(`   latitude PARSED: ${lat}`);
        console.log(`   longitude PARSED: ${lng}`);
        
        // Validación estricta de coordenadas GPS
        const isValidLat = lat !== null && lat !== undefined && !isNaN(lat) && lat !== 0 && Math.abs(lat) <= 90;
        const isValidLng = lng !== null && lng !== undefined && !isNaN(lng) && lng !== 0 && Math.abs(lng) <= 180;
        const isValidGPS = parsedData.gps_valid === true || parsedData.gps_valid === 'true';
        
        console.log(`   VALIDACIÓN: lat=${isValidLat}, lng=${isValidLng}, gps_valid=${isValidGPS}`);
        
        if (isValidGPS && isValidLat && isValidLng) {
          // Mapbox usa formato [longitude, latitude] 
          parsedData.coordinates = [lng, lat];
          parsedData.latitude = lat; // Asegurar que están como números
          parsedData.longitude = lng;
          console.log(`✅ Coordenadas VÁLIDAS para Mapbox: [${lng}, ${lat}]`);
          console.log(`🌍 Verificar ubicación: https://www.google.com/maps?q=${lat},${lng}`);
        } else {
          parsedData.coordinates = null;
          console.warn(`❌ Coordenadas RECHAZADAS:`);
          console.warn(`   Razones: gps_valid=${isValidGPS}, lat_válida=${isValidLat}, lng_válida=${isValidLng}`);
          console.warn(`   Valores: lat=${lat}, lng=${lng}, gps_valid=${parsedData.gps_valid}`);
        }
      } else {
        parsedData.coordinates = null;
        console.log('ℹ️ Sin coordenadas GPS en este mensaje');
      }

      // Validar que tiene los campos requeridos
      if (this.isValidPetData(parsedData)) {
        this.petDataSubject.next(parsedData);
      } else {
        console.warn('⚠️ Datos de mascota incompletos:', parsedData);
      }
    } catch (error) {
      console.error('❌ Error parseando mensaje WebSocket:', error);
    }
  }

  private isValidPetData(data: any): data is PetData {
    // Validación básica sin requerir coordenadas válidas obligatoriamente
    const isValid = data && 
           typeof data.petId === 'number' &&
           typeof data.deviceId === 'string' &&
           data.accelerometer && 
           data.gyroscope;
           
    // Las coordenadas son opcionales - pueden ser null si no hay GPS válido
    if (isValid) {
      console.log(`✅ Datos válidos para petId ${data.petId} con GPS: ${data.coordinates ? 'SÍ' : 'NO'}`);
    }
    
    return isValid;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Máximo número de intentos de reconexión alcanzado');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reintentando conexión en ${delay}ms... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket no está conectado. No se puede enviar mensaje.');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionStatusSubject.next(false);
  }
}
