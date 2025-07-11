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
  activityState?: 'lying' | 'standing' | 'walking' | 'running' | 'disconnected'; // Estado fijo para mascotas demo
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
      location: 'Miraflores, Lima', 
      coordinates: [-77.0282, -12.1211], // Miraflores
      icon: 'fas fa-dog',
      color: '#FF6B35',
      gradient: 'linear-gradient(135deg, #FF6B35, #F7931E)',
      activityState: 'standing' // Max recibe datos reales del ESP32
    },
    { 
      id: 2, 
      name: 'Luna', 
      type: 'cat', 
      breed: 'Siamés', 
      status: 'online', 
      battery: 65, 
      location: 'San Isidro, Lima', 
      coordinates: [-77.0365, -12.1005], // San Isidro
      icon: 'fas fa-cat',
      color: '#9B59B6',
      gradient: 'linear-gradient(135deg, #9B59B6, #8E44AD)',
      activityState: 'lying' // Estado fijo: echada - EJEMPLO DESCANSANDO
    },
    { 
      id: 3, 
      name: 'Charlie', 
      type: 'dog', 
      breed: 'Pastor Alemán', 
      status: 'offline', 
      battery: 23, 
      location: 'Barranco, Lima', 
      coordinates: [-77.0176, -12.1462], // Barranco
      icon: 'fas fa-dog',
      color: '#3498DB',
      gradient: 'linear-gradient(135deg, #3498DB, #2980B9)',
      activityState: 'disconnected' // Estado fijo: desconectado - EJEMPLO OFFLINE
    },
    { 
      id: 4, 
      name: 'Bella', 
      type: 'cat', 
      breed: 'Persa', 
      status: 'online', 
      battery: 89, 
      location: 'Surco, Lima', 
      coordinates: [-76.9931, -12.1340], // Surco
      icon: 'fas fa-cat',
      color: '#E74C3C',
      gradient: 'linear-gradient(135deg, #E74C3C, #C0392B)',
      activityState: 'standing' // Estado fijo: parada
    }
  ];

  constructor() {}

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
}
