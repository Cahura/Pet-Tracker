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
}

@Injectable({
  providedIn: 'root'
})
export class PetSelectionService {
  private selectedPetSubject = new BehaviorSubject<PetData | null>(null);
  public selectedPet$ = this.selectedPetSubject.asObservable();

  // Lista de mascotas demo
  private demoAnimals: PetData[] = [
    { 
      id: 1, 
      name: 'Max', 
      type: 'dog', 
      breed: 'Golden Retriever', 
      status: 'online', 
      battery: 78, 
      location: 'Parque Central, Madrid', 
      coordinates: [-3.7038, 40.4168],
      icon: 'fas fa-dog',
      color: '#FF6B35',
      gradient: 'linear-gradient(135deg, #FF6B35, #F7931E)'
    },
    { 
      id: 2, 
      name: 'Luna', 
      type: 'cat', 
      breed: 'Siamés', 
      status: 'online', 
      battery: 65, 
      location: 'Plaza Mayor, Madrid', 
      coordinates: [-3.7073, 40.4155],
      icon: 'fas fa-cat',
      color: '#9B59B6',
      gradient: 'linear-gradient(135deg, #9B59B6, #8E44AD)'
    },
    { 
      id: 3, 
      name: 'Charlie', 
      type: 'dog', 
      breed: 'Pastor Alemán', 
      status: 'offline', 
      battery: 23, 
      location: 'Retiro, Madrid', 
      coordinates: [-3.6844, 40.4153],
      icon: 'fas fa-dog',
      color: '#3498DB',
      gradient: 'linear-gradient(135deg, #3498DB, #2980B9)'
    },
    { 
      id: 4, 
      name: 'Bella', 
      type: 'cat', 
      breed: 'Persa', 
      status: 'online', 
      battery: 89, 
      location: 'Malasaña, Madrid', 
      coordinates: [-3.7025, 40.4265],
      icon: 'fas fa-cat',
      color: '#E74C3C',
      gradient: 'linear-gradient(135deg, #E74C3C, #C0392B)'
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
