import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import Pusher from 'pusher-js';
import { environment } from '../../environments/environment';

export interface PetLocationData {
  petId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  altitude?: number;
}

export interface PetIMUData {
  petId: string;
  accelX: number;
  accelY: number;
  accelZ: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  timestamp: number;
  activityState: 'lying' | 'standing' | 'walking' | 'running' | 'unknown';
}

export interface PetStatusData {
  petId: string;
  status: 'online' | 'offline';
  batteryLevel?: number;
  signalStrength?: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class RealTimeService {
  private pusher!: Pusher;
  private channel: any;
  private isConnected = false;

  // BehaviorSubjects para los datos en tiempo real
  private locationSubject = new BehaviorSubject<PetLocationData | null>(null);
  private imuSubject = new BehaviorSubject<PetIMUData | null>(null);
  private statusSubject = new BehaviorSubject<PetStatusData | null>(null);
  private connectionSubject = new BehaviorSubject<boolean>(false);

  // Observables públicos
  public location$ = this.locationSubject.asObservable();
  public imuData$ = this.imuSubject.asObservable();
  public status$ = this.statusSubject.asObservable();
  public connection$ = this.connectionSubject.asObservable();

  constructor() {
    this.initializePusher();
  }

  private initializePusher(): void {
    try {
      console.log('Initializing Pusher with config:', environment.pusher);
      
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

      // Event listeners para la conexión
      this.pusher.connection.bind('connected', () => {
        console.log('Pusher connected successfully');
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
      // Usar el APP_ID como nombre del canal
      this.channel = this.pusher.subscribe('pet-tracker');

      // Escuchar eventos de ubicación GPS
      this.channel.bind('location-update', (data: PetLocationData) => {
        console.log('Received location update:', data);
        this.locationSubject.next(data);
      });

      // Escuchar eventos de datos IMU
      this.channel.bind('imu-update', (data: PetIMUData) => {
        console.log('Received IMU update:', data);
        this.imuSubject.next(data);
      });

      // Escuchar eventos de estado del dispositivo
      this.channel.bind('status-update', (data: PetStatusData) => {
        console.log('Received status update:', data);
        this.statusSubject.next(data);
      });

      // Evento de conexión del canal
      this.channel.bind('pusher:subscription_succeeded', () => {
        console.log('Successfully subscribed to pet-tracker channel');
      });

      this.channel.bind('pusher:subscription_error', (error: any) => {
        console.error('Failed to subscribe to channel:', error);
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

  // Método para simular datos (útil para testing)
  public simulateData(): void {
    if (!environment.production) {
      // Simular ubicación (Madrid center con variación)
      const mockLocation: PetLocationData = {
        petId: 'pet-001',
        latitude: 40.4168 + (Math.random() - 0.5) * 0.01,
        longitude: -3.7038 + (Math.random() - 0.5) * 0.01,
        timestamp: Date.now(),
        accuracy: Math.random() * 10 + 2,
        speed: Math.random() * 5,
        altitude: 650 + Math.random() * 50
      };

      // Simular datos IMU
      const mockIMU: PetIMUData = {
        petId: 'pet-001',
        accelX: (Math.random() - 0.5) * 2,
        accelY: (Math.random() - 0.5) * 2,
        accelZ: 9.8 + (Math.random() - 0.5) * 2,
        gyroX: (Math.random() - 0.5) * 100,
        gyroY: (Math.random() - 0.5) * 100,
        gyroZ: (Math.random() - 0.5) * 100,
        timestamp: Date.now(),
        activityState: Math.random() > 0.5 ? 'standing' : 'lying'
      };

      // Simular estado
      const mockStatus: PetStatusData = {
        petId: 'pet-001',
        status: 'online',
        batteryLevel: Math.floor(Math.random() * 100),
        signalStrength: Math.floor(Math.random() * 100),
        timestamp: Date.now()
      };

      this.locationSubject.next(mockLocation);
      this.imuSubject.next(mockIMU);
      this.statusSubject.next(mockStatus);
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
