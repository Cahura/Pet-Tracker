import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PetData {
  id: number;
  name: string;
  type: 'dog' | 'cat';
  breed: string;
  status: 'online' | 'offline';
  battery: number;
  location: string;
  coordinates: [number, number];
  icon: string; // FontAwesome icon class
  color: string; // Primary color for the pet
  gradient: string; // Gradient for avatar background
  photoUrl?: string; // URL de la foto principal de la mascota
  activityState?: 'lying' | 'standing' | 'walking' | 'running' | 'disconnected'; // Estado fijo para mascotas demo
  imuData?: IMUData; // Datos del sensor IMU en tiempo real
  activityHistory?: ActivityRecord[]; // Historial de actividad
}

export interface IMUData {
  accelerometer: {
    x: number;
    y: number;
    z: number;
  };
  gyroscope: {
    x: number;
    y: number;
    z: number;
  };
  magnitudes: {
    accelerometer: number;
    gyroscope: number;
  };
  temperature: number;
  timestamp: string;
  deviceId: string;
}

export interface ActivityRecord {
  state: 'lying' | 'standing' | 'walking' | 'running';
  confidence: number;
  duration: number; // en minutos
  startTime: Date;
  endTime?: Date;
  imuMagnitudes?: {
    accelerometer: number;
    gyroscope: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PetSelectionService {
  private selectedPetSubject = new BehaviorSubject<PetData | null>(null);
  public selectedPet$ = this.selectedPetSubject.asObservable();

  // Lista de mascotas demo - Ubicaciones en Lima, Perú
  private demoAnimals: PetData[] = [
    { 
      id: 1, 
      name: 'Max', 
      type: 'dog', 
      breed: 'Golden Retriever', 
      status: 'online', 
      battery: 78, 
      location: 'UPC Monterrico, Lima', 
      coordinates: [-76.96358, -12.10426], // UPC Monterrico
      icon: 'fas fa-dog',
      color: '#FF6B35',
      gradient: 'linear-gradient(135deg, #FF6B35, #F7931E)',
      photoUrl: '/assets/mascotas/Golden_Retriever.jpg', // Cambiar a .jpg cuando copies la imagen real
      activityState: 'standing' // Max recibe datos reales del ESP32
    },
    { 
      id: 2, 
      name: 'Luna', 
      type: 'cat', 
      breed: 'Siamés', 
      status: 'online', 
      battery: 65, 
      location: 'Santa Isabel, Lima', 
      coordinates: [-76.9568, -12.0631], // Santa Isabel (coordenadas genéricas para repo)
      icon: 'fas fa-cat',
      color: '#9B59B6',
      gradient: 'linear-gradient(135deg, #9B59B6, #8E44AD)',
      photoUrl: '/assets/mascotas/Siames.jpg', // Cambiar a .jpg cuando copies la imagen real
      activityState: 'walking' // Estado: explorando el parque
    },
    { 
      id: 3, 
      name: 'Charlie', 
      type: 'dog', 
      breed: 'Pastor Alemán', 
      status: 'offline', 
      battery: 23, 
      location: 'Plaza Municipal, Barranco', 
      coordinates: [-77.0185, -12.1425], // Plaza Municipal de Barranco
      icon: 'fas fa-dog',
      color: '#3498DB',
      gradient: 'linear-gradient(135deg, #3498DB, #2980B9)',
      photoUrl: '/assets/mascotas/Pastor_Aleman.jpg', // Cambiar a .jpg cuando copies la imagen real
      activityState: 'disconnected' // Estado fijo: desconectado - EJEMPLO OFFLINE
    },
    { 
      id: 4, 
      name: 'Bella', 
      type: 'cat', 
      breed: 'Persa', 
      status: 'online', 
      battery: 89, 
      location: 'Av. Primavera, Surco', 
      coordinates: [-76.9925, -12.1280], // Av. Primavera, Surco
      icon: 'fas fa-cat',
      color: '#E74C3C',
      gradient: 'linear-gradient(135deg, #E74C3C, #C0392B)',
      photoUrl: '/assets/mascotas/Persa.jpg', // Cambiar a .jpg cuando copies la imagen real
      activityState: 'standing' // Estado fijo: parada
    }
  ];

  constructor() {
    // Seleccionar mascota demo por defecto al iniciar
    if (!this.selectedPetSubject.value && this.demoAnimals.length > 0) {
      this.selectedPetSubject.next(this.demoAnimals[0]);
    }
  }

  getDemoAnimals(): PetData[] {
    return this.demoAnimals;
  }

  selectPet(petName: string) {
    const selectedPet = this.demoAnimals.find(pet => pet.name === petName);
    if (selectedPet) {
      this.selectedPetSubject.next(selectedPet);
      console.log('Pet selected:', selectedPet);
    } else {
      console.error('Pet not found:', petName);
      // Fallback to first pet
      this.selectedPetSubject.next(this.demoAnimals[0]);
    }
  }

  selectPetById(petId: number) {
    const selectedPet = this.demoAnimals.find(pet => pet.id === petId);
    if (selectedPet) {
      this.selectedPetSubject.next(selectedPet);
      console.log('Pet selected by ID:', selectedPet);
    }
  }

  getCurrentPet(): PetData | null {
    return this.selectedPetSubject.value;
  }

  getDefaultPet(): PetData {
    return this.demoAnimals[0];
  }

  // Métodos para actualizar datos IMU y estado de actividad desde ESP32C6
  updatePetIMUData(petId: number, imuData: IMUData) {
    const pet = this.demoAnimals.find(p => p.id === petId);
    if (pet) {
      pet.imuData = imuData;
      if (pet === this.selectedPetSubject.value) {
        this.selectedPetSubject.next(pet);
      }
    }
  }

  updatePetActivityState(petId: number, activityState: 'lying' | 'standing' | 'walking' | 'running' | 'disconnected') {
    const pet = this.demoAnimals.find(p => p.id === petId);
    if (pet) {
      pet.activityState = activityState;
      if (pet === this.selectedPetSubject.value) {
        this.selectedPetSubject.next(pet);
      }
    }
  }

  // Métodos para el componente IMU
  getIMUData(petId: number): IMUData | null {
    const pet = this.demoAnimals.find(p => p.id === petId);
    return pet?.imuData || null;
  }

  getActivityHistory(petId: number): ActivityRecord[] {
    const pet = this.demoAnimals.find(p => p.id === petId);
    return pet?.activityHistory || [];
  }

  getActivityStats(petId: number): any {
    const pet = this.demoAnimals.find(p => p.id === petId);
    const history = pet?.activityHistory || [];
    
    // Calcular estadísticas básicas
    const today = new Date();
    const todayRecords = history.filter(record => {
      const recordDate = new Date(record.startTime);
      return recordDate.toDateString() === today.toDateString();
    });

    const totalMinutes = todayRecords.reduce((total, record) => total + record.duration, 0);
    const walkingMinutes = todayRecords
      .filter(record => record.state === 'walking')
      .reduce((total, record) => total + record.duration, 0);
    const runningMinutes = todayRecords
      .filter(record => record.state === 'running')
      .reduce((total, record) => total + record.duration, 0);

    return {
      totalActivityToday: totalMinutes,
      walkingTime: walkingMinutes,
      runningTime: runningMinutes,
      activeTime: walkingMinutes + runningMinutes,
      restTime: totalMinutes - (walkingMinutes + runningMinutes)
    };
  }
}
