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

// Archivo eliminado: este servicio ya no se usa. Usa WebSocketService en su lugar.
