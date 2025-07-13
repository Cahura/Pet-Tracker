import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import Pusher from 'pusher-js';
import { environment } from '../../environments/environment';

// Interfaces optimizadas para ESP32 + Soketi
export interface PetLocationData {
  petId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
}

export interface PetIMUData {
  petId: string;
  accelX: number;
  accelY: number;
  accelZ: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  activity: 'lying' | 'standing' | 'walking' | 'running' | 'unknown';
  timestamp: number;
}

export interface PetBatteryData {
  petId: string;
  batteryLevel: number;
  signalStrength: number;
  status: 'online' | 'offline';
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class RealTimeService {
  private pusher!: Pusher;
  private channel: any;
  private isConnected = false;

  // BehaviorSubjects optimizados para los 3 tipos de datos
  private locationSubject = new BehaviorSubject<PetLocationData | null>(null);
  private imuSubject = new BehaviorSubject<PetIMUData | null>(null);
  private batterySubject = new BehaviorSubject<PetBatteryData | null>(null);
  private connectionSubject = new BehaviorSubject<boolean>(false);

  // Observables públicos optimizados
  public location$ = this.locationSubject.asObservable();
  public imuData$ = this.imuSubject.asObservable();
  public battery$ = this.batterySubject.asObservable();
  public connection$ = this.connectionSubject.asObservable();

  constructor() {
    this.initializePusher();
  }

  private initializePusher(): void {
    try {
      console.log('Initializing Pusher for production with config:', environment.pusher);
      
      this.pusher = new Pusher(environment.pusher.key, {
        cluster: environment.pusher.cluster,
        wsHost: environment.pusher.wsHost,
        wsPort: environment.pusher.wsPort,
        wssPort: environment.pusher.wssPort,
        forceTLS: environment.pusher.forceTLS,
        enabledTransports: ['ws', 'wss'] as any,
        disableStats: true,
        authEndpoint: undefined // No necesitamos autenticación para canales públicos
      });

      // Event listeners para la conexión optimizados para producción
      this.pusher.connection.bind('connected', () => {
        console.log('✅ Pusher connected - Ready for ESP32 data');
        this.isConnected = true;
        this.connectionSubject.next(true);
      });

      this.pusher.connection.bind('disconnected', () => {
        console.log('Pusher disconnected');
        this.isConnected = false;
        this.connectionSubject.next(false);
      });

      this.pusher.connection.bind('error', (error: any) => {
        console.error('Pusher connection error:', error);
        this.connectionSubject.next(false);
      });

      // Suscribirse al canal de datos de mascotas
      this.subscribeToChannel();

    } catch (error) {
      console.error('Error initializing Pusher:', error);
      this.connectionSubject.next(false);
    }
  }

  private subscribeToChannel(): void {
    try {
      // Suscribirse al canal pet-tracker
      this.channel = this.pusher.subscribe('pet-tracker');

      // GPS Data - cada 2 segundos
      let lastLocationUpdate = 0;
      this.channel.bind('location-update', (data: PetLocationData) => {
        const now = Date.now();
        if (now - lastLocationUpdate > 1000) {
          console.log('📍 GPS recibido:', data);
          this.locationSubject.next(data);
          lastLocationUpdate = now;
        }
      });

      // IMU Data - cada 1 segundo
      let lastIMUUpdate = 0;
      this.channel.bind('imu-update', (data: PetIMUData) => {
        const now = Date.now();
        if (now - lastIMUUpdate > 500) {
          console.log('📊 IMU recibido:', data);
          this.imuSubject.next(data);
          lastIMUUpdate = now;
        }
      });

      // Battery Data - cada 5 segundos
      let lastBatteryUpdate = 0;
      this.channel.bind('battery-update', (data: PetBatteryData) => {
        const now = Date.now();
        if (now - lastBatteryUpdate > 3000) {
          console.log('🔋 Batería recibida:', data);
          this.batterySubject.next(data);
          lastBatteryUpdate = now;
        }
      });

      // Eventos del canal
      this.channel.bind('pusher:subscription_succeeded', () => {
        console.log('✅ Conectado a pet-tracker - Esperando datos ESP32');
      });

      this.channel.bind('pusher:subscription_error', (error: any) => {
        console.error('❌ Error en canal:', error);
      });

    } catch (error) {
      console.error('Error subscribing to channel:', error);
    }
  }

  // Método para obtener el estado de conexión actual
  public isConnectedToPusher(): boolean {
    return this.isConnected;
  }

  // Método para reconectar manualmente
  public reconnect(): void {
    if (this.pusher) {
      this.pusher.disconnect();
    }
    setTimeout(() => {
      this.initializePusher();
    }, 1000);
  }

  // Método para simular datos optimizado para ESP32
  public simulateData(): void {
    if (!environment.production) {
      // Simular GPS (Madrid con variación realista) - SOLO PARA MAX (ID: 1)
      const mockLocation: PetLocationData = {
        petId: '1', // Max es ID 1 - la única mascota real
        latitude: 40.4168 + (Math.random() - 0.5) * 0.001,
        longitude: -3.7038 + (Math.random() - 0.5) * 0.001,
        altitude: 650 + Math.random() * 10,
        timestamp: Date.now()
      };

      // Simular IMU con actividad - SOLO PARA MAX (ID: 1)
      const activities: ('lying' | 'standing' | 'walking' | 'running' | 'unknown')[] = 
        ['lying', 'standing', 'walking', 'running'];
      const mockIMU: PetIMUData = {
        petId: '1', // Max es ID 1 - la única mascota real
        accelX: (Math.random() - 0.5) * 2,
        accelY: (Math.random() - 0.5) * 2,
        accelZ: 9.8 + (Math.random() - 0.5) * 0.5,
        gyroX: (Math.random() - 0.5) * 10,
        gyroY: (Math.random() - 0.5) * 10,
        gyroZ: (Math.random() - 0.5) * 10,
        activity: activities[Math.floor(Math.random() * activities.length)],
        timestamp: Date.now()
      };

      // Simular batería - SOLO PARA MAX (ID: 1)
      const mockBattery: PetBatteryData = {
        petId: '1', // Max es ID 1 - la única mascota real
        batteryLevel: Math.floor(Math.random() * 100),
        signalStrength: Math.floor(Math.random() * 100),
        status: 'online',
        timestamp: Date.now()
      };

      this.locationSubject.next(mockLocation);
      this.imuSubject.next(mockIMU);
      this.batterySubject.next(mockBattery);
    }
  }

  // Método para limpiar conexiones al destruir el servicio
  public disconnect(): void {
    if (this.pusher) {
      this.pusher.unsubscribe('pet-tracker');
      this.pusher.disconnect();
    }
  }
}
