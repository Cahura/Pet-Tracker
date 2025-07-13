import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PetLocationData {
  petId: number;
  coordinates: [number, number];
  battery: number;
  timestamp: string;
  accuracy: number;
  speed: number;
  activity: string;
}

export interface DeviceConnection {
  deviceId: string;
  petId: number;
  timestamp: string;
}

export interface SafeZoneConfig {
  petId: number;
  center: [number, number];
  radius: number;
}

export interface SafeZoneAlert {
  petId: number;
  coordinates: [number, number];
  distance: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private isConnected: boolean = false;

  constructor() {
    this.socket = io(environment.socketUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.socket.on('connect', () => {
      console.log('🟢 Conectado a Socket.IO');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('🔴 Desconectado de Socket.IO');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error);
    });
  }

  // Métodos de conexión
  connect(): void {
    if (!this.isConnected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.isConnected) {
      this.socket.disconnect();
    }
  }

  // Métodos de tracking
  startTracking(petId: number, interval: number = 5000, minDistance: number = 10): void {
    this.socket.emit('start-tracking', {
      petId,
      interval,
      minDistance
    });
  }

  stopTracking(petId: number): void {
    this.socket.emit('stop-tracking', {
      petId
    });
  }

  // Configuración de zona segura
  configureSafeZone(config: SafeZoneConfig): void {
    this.socket.emit('configure-safe-zone', config);
  }

  // Obtener datos de mascotas
  getPetsData(): void {
    this.socket.emit('get-pets-data');
  }

  // Observables para eventos
  onPetLocationUpdate(): Observable<PetLocationData> {
    return new Observable(observer => {
      this.socket.on('pet-location-update', (data: PetLocationData) => {
        observer.next(data);
      });
    });
  }

  onDeviceConnected(): Observable<DeviceConnection> {
    return new Observable(observer => {
      this.socket.on('device-connected', (data: DeviceConnection) => {
        observer.next(data);
      });
    });
  }

  onDeviceDisconnected(): Observable<{petId: number}> {
    return new Observable(observer => {
      this.socket.on('device-disconnected', (data: {petId: number}) => {
        observer.next(data);
      });
    });
  }

  onTrackingStarted(): Observable<{petId: number, timestamp: string}> {
    return new Observable(observer => {
      this.socket.on('tracking-started', (data: {petId: number, timestamp: string}) => {
        observer.next(data);
      });
    });
  }

  onTrackingStopped(): Observable<{petId: number, timestamp: string}> {
    return new Observable(observer => {
      this.socket.on('tracking-stopped', (data: {petId: number, timestamp: string}) => {
        observer.next(data);
      });
    });
  }

  onSafeZoneConfigured(): Observable<{petId: number, timestamp: string}> {
    return new Observable(observer => {
      this.socket.on('safe-zone-configured', (data: {petId: number, timestamp: string}) => {
        observer.next(data);
      });
    });
  }

  onSafeZoneViolation(): Observable<SafeZoneAlert> {
    return new Observable(observer => {
      this.socket.on('safe-zone-violation', (data: SafeZoneAlert) => {
        observer.next(data);
      });
    });
  }

  onPetsData(): Observable<any[]> {
    return new Observable(observer => {
      this.socket.on('pets-data', (data: any[]) => {
        observer.next(data);
      });
    });
  }

  onBatteryAlert(): Observable<{petId: number, battery: number, deviceId: string}> {
    return new Observable(observer => {
      this.socket.on('battery-alert', (data: {petId: number, battery: number, deviceId: string}) => {
        observer.next(data);
      });
    });
  }

  // Getter para estado de conexión
  get connected(): boolean {
    return this.isConnected;
  }
}
