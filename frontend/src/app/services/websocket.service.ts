import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PetData {
  petId: number;
  deviceId: string;
  timestamp: number;
  coordinates: [number, number];
  battery: number;
  activity: string;
  accelerometer: { x: number; y: number; z: number };
  gyroscope: { x: number; y: number; z: number };
  temperature: number;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws!: WebSocket;
  private petDataSubject = new BehaviorSubject<PetData | null>(null);
  public petData$: Observable<PetData | null> = this.petDataSubject.asObservable();

  constructor(private ngZone: NgZone) {
    this.connect();
  }

  connect() {
    const wsUrl = environment.wsUrl;
    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => {
      console.log('🟢 WebSocket conectado a Railway');
    };
    this.ws.onclose = () => {
      console.log('🔴 WebSocket desconectado. Reintentando en 3s...');
      setTimeout(() => this.connect(), 3000);
    };
    this.ws.onerror = (err) => {
      console.error('❌ Error WebSocket:', err);
    };
    this.ws.onmessage = (event) => {
      this.ngZone.run(() => {
        try {
          const data = JSON.parse(event.data);
          if (data.coordinates && data.accelerometer && data.gyroscope) {
            this.petDataSubject.next(data);
          }
        } catch (e) {
          console.error('❌ Error parseando mensaje WebSocket:', e);
        }
      });
    };
  }
}
