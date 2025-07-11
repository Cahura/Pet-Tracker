import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PetData } from '../services/pet-selection.service';

export interface PetPhoto {
  id: string;
  petId: number;
  url: string;
  thumbnail: string;
  timestamp: Date;
  location: string;
  description?: string;
}

@Component({
  selector: 'app-pet-photos',
  template: `
    <div class="pet-photos-container">
      <div class="photos-header">
        <h2>Fotos de {{ currentPet?.name || 'Mascota' }}</h2>
        <button class="add-photo-btn" (click)="addPhoto()">
          <i class="fas fa-plus"></i>
          <span>Añadir</span>
        </button>
      </div>

      <!-- Foto principal de la mascota -->
      <div class="main-photo-section">
        <div class="main-photo-card">
          <div class="photo-avatar">
            <img [src]="getMainPhoto()" [alt]="currentPet?.name || 'Mascota'" />
            <div class="photo-overlay">
              <div class="pet-info">
                <h3>{{ currentPet?.name }}</h3>
                <p>{{ currentPet?.breed }}</p>
              </div>
            </div>
          </div>
          <div class="photo-stats">
            <div class="stat">
              <i class="fas fa-camera"></i>
              <span>{{ petPhotos.length }} fotos</span>
            </div>
            <div class="stat">
              <i class="fas fa-heart"></i>
              <span>Mascota adorable</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Galería de fotos -->
      <div class="photos-gallery" *ngIf="petPhotos.length > 0">
        <h3>Galería de fotos</h3>
        <div class="photos-grid">
          <div class="photo-item" *ngFor="let photo of petPhotos" (click)="viewPhoto(photo)">
            <div class="photo-thumbnail">
              <img [src]="photo.thumbnail" [alt]="photo.description || 'Foto de ' + currentPet?.name" />
              <div class="photo-date">
                {{ formatDate(photo.timestamp) }}
              </div>
            </div>
            <div class="photo-info">
              <p class="photo-location">{{ photo.location }}</p>
              <p class="photo-description" *ngIf="photo.description">{{ photo.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Estado vacío -->
      <div class="empty-photos" *ngIf="petPhotos.length === 0">
        <div class="empty-icon">
          <i class="fas fa-camera"></i>
        </div>
        <h3>No hay fotos aún</h3>
        <p>Comienza a capturar los momentos especiales de {{ currentPet?.name || 'tu mascota' }}</p>
        <button class="add-first-photo-btn" (click)="addPhoto()">
          <i class="fas fa-camera"></i>
          <span>Añadir primera foto</span>
        </button>
      </div>
    </div>

    <!-- Modal para ver foto -->
    <div class="photo-modal" [class.show]="selectedPhoto" (click)="closePhotoModal()">
      <div class="photo-modal-content" (click)="$event.stopPropagation()" *ngIf="selectedPhoto">
        <div class="photo-modal-header">
          <h3>{{ selectedPhoto.description || currentPet?.name }}</h3>
          <button class="close-btn" (click)="closePhotoModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="photo-modal-body">
          <img [src]="selectedPhoto.url" [alt]="selectedPhoto.description" />
          <div class="photo-details">
            <div class="detail-row">
              <i class="fas fa-calendar"></i>
              <span>{{ formatDateTime(selectedPhoto.timestamp) }}</span>
            </div>
            <div class="detail-row">
              <i class="fas fa-map-marker-alt"></i>
              <span>{{ selectedPhoto.location }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedPhoto.description">
              <i class="fas fa-comment"></i>
              <span>{{ selectedPhoto.description }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pet-photos-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    .photos-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .photos-header h2 {
      color: var(--text-primary);
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }

    .add-photo-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .add-photo-btn:hover {
      background: #0056b3;
      transform: translateY(-1px);
    }

    .main-photo-section {
      margin-bottom: 32px;
    }

    .main-photo-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      overflow: hidden;
      transition: all var(--transition-fast);
    }

    .main-photo-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
    }

    .photo-avatar {
      position: relative;
      height: 300px;
      overflow: hidden;
    }

    .photo-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .photo-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
      padding: 20px;
      color: white;
    }

    .pet-info h3 {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    .pet-info p {
      font-size: 16px;
      opacity: 0.9;
      margin: 0;
    }

    .photo-stats {
      display: flex;
      justify-content: space-around;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary);
      font-size: 14px;
    }

    .stat i {
      color: var(--primary-color);
    }

    .photos-gallery h3 {
      color: var(--text-primary);
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }

    .photos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .photo-item {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .photo-item:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .photo-thumbnail {
      position: relative;
      height: 150px;
      overflow: hidden;
    }

    .photo-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .photo-date {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 500;
    }

    .photo-info {
      padding: 12px;
    }

    .photo-location {
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 500;
      margin: 0 0 4px 0;
    }

    .photo-description {
      color: var(--text-secondary);
      font-size: 12px;
      margin: 0;
      line-height: 1.4;
    }

    .empty-photos {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary);
    }

    .empty-icon {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 32px;
      color: var(--primary-color);
    }

    .empty-photos h3 {
      color: var(--text-primary);
      font-size: 20px;
      margin: 0 0 8px 0;
    }

    .empty-photos p {
      margin: 0 0 24px 0;
      line-height: 1.5;
    }

    .add-first-photo-btn {
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 14px 24px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 auto;
      transition: all var(--transition-fast);
    }

    .add-first-photo-btn:hover {
      background: #0056b3;
      transform: translateY(-1px);
    }

    /* Modal styles */
    .photo-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(15px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10003;
      opacity: 0;
      visibility: hidden;
      transition: all var(--transition-normal);
    }

    .photo-modal.show {
      opacity: 1;
      visibility: visible;
    }

    .photo-modal-content {
      background: var(--glass-primary);
      border: 1px solid var(--liquid-glass-border);
      border-radius: 24px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow: hidden;
      backdrop-filter: blur(30px);
    }

    .photo-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .photo-modal-header h3 {
      color: var(--text-primary);
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .close-btn {
      width: 36px;
      height: 36px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .photo-modal-body {
      padding: 24px;
    }

    .photo-modal-body img {
      width: 100%;
      max-height: 400px;
      object-fit: cover;
      border-radius: 16px;
      margin-bottom: 16px;
    }

    .photo-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--text-secondary);
      font-size: 14px;
    }

    .detail-row i {
      color: var(--primary-color);
      width: 16px;
    }

    @media (max-width: 768px) {
      .photos-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .photos-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .photo-thumbnail {
        height: 120px;
      }

      .photo-avatar {
        height: 200px;
      }

      .photo-modal-content {
        width: 95%;
        margin: 20px;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PetPhotosComponent {
  @Input() currentPet: PetData | null = null;
  
  selectedPhoto: PetPhoto | null = null;
  
  // Fotos de ejemplo - una imagen principal para cada mascota
  petPhotos: PetPhoto[] = [
    {
      id: '1',
      petId: 1,
      url: '/assets/pet-avatar.svg',
      thumbnail: '/assets/pet-avatar.svg',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      location: 'Parque Central, Madrid',
      description: 'Max disfrutando del parque'
    },
    {
      id: '2',
      petId: 2,
      url: '/assets/pet-icon.svg',
      thumbnail: '/assets/pet-icon.svg',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      location: 'Plaza Mayor, Madrid',
      description: 'Luna explorando la ciudad'
    }
  ];

  getMainPhoto(): string {
    if (this.currentPet) {
      const petPhoto = this.petPhotos.find(photo => photo.petId === this.currentPet!.id);
      if (petPhoto) {
        return petPhoto.url;
      }
    }
    return '/assets/pet-avatar.svg';
  }

  addPhoto() {
    console.log('Añadir nueva foto para', this.currentPet?.name);
    // Aquí implementarías la lógica para añadir fotos
    // Por ejemplo, abrir un selector de archivos o la cámara
  }

  viewPhoto(photo: PetPhoto) {
    this.selectedPhoto = photo;
  }

  closePhotoModal() {
    this.selectedPhoto = null;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit'
    });
  }

  formatDateTime(date: Date): string {
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
