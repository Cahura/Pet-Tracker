import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PetLocation {
  latitude: number;
  longitude: number;
  timestamp: Date;
  battery: number;
  accuracy: number;
  speed?: number;
  heading?: number;
}

export interface PetStatus {
  isOnline: boolean;
  lastSeen: Date;
  battery: number;
  signalStrength: number;
}

@Injectable({
  providedIn: 'root'
})
export class PetLocationService {
  private currentLocationSubject = new BehaviorSubject<PetLocation>({
    latitude: 40.4168,
    longitude: -3.7038,
    timestamp: new Date(),
    battery: 85,
    accuracy: 10
  });

  private statusSubject = new BehaviorSubject<PetStatus>({
    isOnline: true,
    lastSeen: new Date(),
    battery: 85,
    signalStrength: 4
  });

  private locationHistorySubject = new BehaviorSubject<PetLocation[]>([]);

  public currentLocation$ = this.currentLocationSubject.asObservable();
  public status$ = this.statusSubject.asObservable();
  public locationHistory$ = this.locationHistorySubject.asObservable();

  constructor() {
    this.startLocationSimulation();
  }

  // Simular datos del ESP32 para desarrollo
  private startLocationSimulation() {
    interval(5000).pipe(
      map(() => {
        const currentLoc = this.currentLocationSubject.value;
        const newLocation: PetLocation = {
          latitude: currentLoc.latitude + (Math.random() - 0.5) * 0.001,
          longitude: currentLoc.longitude + (Math.random() - 0.5) * 0.001,
          timestamp: new Date(),
          battery: Math.max(20, currentLoc.battery - Math.random() * 2),
          accuracy: Math.random() * 15 + 5,
          speed: Math.random() * 10,
          heading: Math.random() * 360
        };
        return newLocation;
      })
    ).subscribe(location => {
      this.updateLocation(location);
    });
  }

  private updateLocation(location: PetLocation) {
    this.currentLocationSubject.next(location);
    
    // Actualizar historial
    const history = this.locationHistorySubject.value;
    history.push(location);
    
    // Mantener solo los últimos 100 puntos
    if (history.length > 100) {
      history.shift();
    }
    
    this.locationHistorySubject.next(history);
    
    // Actualizar estado
    this.statusSubject.next({
      isOnline: true,
      lastSeen: location.timestamp,
      battery: location.battery,
      signalStrength: Math.floor(Math.random() * 5) + 1
    });
  }

  // Métodos para integración con ESP32
  public connectToESP32(deviceId: string): Promise<boolean> {
    // Aquí iría la lógica para conectar con el ESP32
    // Por ahora retornamos una promesa resuelta
    return Promise.resolve(true);
  }

  public sendCommandToESP32(command: string): Promise<boolean> {
    // Aquí iría la lógica para enviar comandos al ESP32
    console.log(`Sending command to ESP32: ${command}`);
    return Promise.resolve(true);
  }

  public getCurrentLocation(): PetLocation {
    return this.currentLocationSubject.value;
  }

  public getLocationHistory(): PetLocation[] {
    return this.locationHistorySubject.value;
  }

  public getStatus(): PetStatus {
    return this.statusSubject.value;
  }

  // Métodos para configuración
  public setUpdateInterval(intervalMs: number) {
    // Configurar intervalo de actualización
  }

  public enableGeofencing(center: [number, number], radius: number) {
    // Configurar geofencing
  }

  public setLowBatteryThreshold(threshold: number) {
    // Configurar umbral de batería baja
  }
}
