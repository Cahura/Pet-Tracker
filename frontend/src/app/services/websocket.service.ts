import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PetData {
  petId: number;
  deviceId: string;
  timestamp: number;
  coordinates: [number, number];
  battery: number;
  activity: string; // "resting", "walking", "running", "traveling"
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
  wifi_rssi?: number; // Señal WiFi
  free_heap?: number; // Memoria disponible
  uptime_ms?: number; // Tiempo de funcionamiento
  analysis_method?: string; // Método de análisis usado
  data_quality?: string; // Calidad de los datos
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
      
      // Normalizar datos: convertir latitude/longitude a coordinates si es necesario
      if (parsedData.latitude !== undefined && parsedData.longitude !== undefined) {
        parsedData.coordinates = [parsedData.longitude, parsedData.latitude];
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
    return data && 
           typeof data.petId === 'number' &&
           typeof data.deviceId === 'string' &&
           Array.isArray(data.coordinates) &&
           data.coordinates.length === 2 &&
           data.accelerometer && 
           data.gyroscope;
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
