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

// Archivo eliminado: este servicio ya no se usa. Usa WebSocketService en su lugar.
