import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PetData } from '../services/pet-selection.service';
import { Subscription } from 'rxjs';

export interface SafeZone {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  radius: number; // in meters
  type: 'home' | 'park' | 'work' | 'custom';
  isActive: boolean;
  createdAt: Date;
  notifications: boolean;
}

export interface LocationAlert {
  id: string;
  petId: number;
  type: 'entered' | 'exited' | 'outside_too_long';
  zoneName: string;
  timestamp: Date;
  message: string;
}

@Component({
  selector: 'app-safe-zones',
  template: `
    <div class="safe-zones-container">
      <div class="safe-zones-header">
        <h2>Zonas Seguras</h2>
        <button class="add-zone-btn" (click)="showAddZoneModal = true">
          <i class="fas fa-plus"></i>
          <span>Añadir Zona</span>
        </button>
      </div>

      <!-- Lista de zonas existentes -->
      <div class="zones-list" *ngIf="safeZones.length > 0">
        <div class="zone-card" *ngFor="let zone of safeZones" [class.active]="zone.isActive">
          <div class="zone-info">
            <div class="zone-icon">
              <i class="fas" [class.fa-home]="zone.type === 'home'" 
                              [class.fa-tree]="zone.type === 'park'"
                              [class.fa-briefcase]="zone.type === 'work'"
                              [class.fa-map-marker-alt]="zone.type === 'custom'"></i>
            </div>
            <div class="zone-details">
              <h4>{{ zone.name }}</h4>
              <p>Radio: {{ zone.radius }}m</p>
              <span class="zone-status" [class.active]="zone.isActive">
                {{ zone.isActive ? 'Activa' : 'Inactiva' }}
              </span>
            </div>
          </div>
          <div class="zone-actions">
            <button class="action-btn" (click)="toggleZone(zone)">
              <i class="fas" [class.fa-eye]="zone.isActive" [class.fa-eye-slash]="!zone.isActive"></i>
            </button>
            <button class="action-btn" (click)="editZone(zone)">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn danger" (click)="deleteZone(zone)">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Estado vacío -->
      <div class="empty-state" *ngIf="safeZones.length === 0">
        <div class="empty-icon">
          <i class="fas fa-shield-alt"></i>
        </div>
        <h3>No hay zonas seguras</h3>
        <p>Añade zonas seguras para recibir notificaciones cuando tu mascota entre o salga de ellas.</p>
        <button class="add-first-zone-btn" (click)="showAddZoneModal = true">
          <i class="fas fa-plus"></i>
          <span>Crear primera zona</span>
        </button>
      </div>

      <!-- Botón para mostrar zona en el mapa -->
      <div class="map-controls">
        <button class="safe-zone-map-toggle" 
                [class.active]="showingZoneOnMap" 
                (click)="toggleSafeZoneOnMap()">
          <i class="fas" [class.fa-map-marked-alt]="!showingZoneOnMap" [class.fa-eye-slash]="showingZoneOnMap"></i>
          <span>{{ showingZoneOnMap ? 'Ocultar en Mapa' : 'Mostrar en Mapa' }}</span>
        </button>
      </div>

      <!-- Alertas recientes -->
      <div class="recent-alerts" *ngIf="locationAlerts.length > 0">
        <h3>Alertas Recientes</h3>
        <div class="alerts-list">
          <div class="alert-item" *ngFor="let alert of locationAlerts.slice(0, 3)">
            <div class="alert-icon" [class.entered]="alert.type === 'entered'" 
                                    [class.exited]="alert.type === 'exited'"
                                    [class.warning]="alert.type === 'outside_too_long'">
              <i class="fas" [class.fa-sign-in-alt]="alert.type === 'entered'"
                            [class.fa-sign-out-alt]="alert.type === 'exited'"
                            [class.fa-exclamation-triangle]="alert.type === 'outside_too_long'"></i>
            </div>
            <div class="alert-content">
              <p>{{ alert.message }}</p>
              <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para añadir zona -->
    <div class="add-zone-modal" [class.show]="showAddZoneModal" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Añadir Zona Segura</h3>
          <button class="close-btn" (click)="closeModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nombre de la zona</label>
            <input type="text" [(ngModel)]="newZone.name" placeholder="Ej: Casa, Parque, Oficina">
          </div>
          <div class="form-group">
            <label>Tipo de zona</label>
            <select [(ngModel)]="newZone.type">
              <option value="home">Casa</option>
              <option value="park">Parque</option>
              <option value="work">Trabajo</option>
              <option value="custom">Personalizada</option>
            </select>
          </div>
          <div class="form-group">
            <label>Radio (metros)</label>
            <input type="number" [(ngModel)]="newZone.radius" min="10" max="1000" step="10">
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="newZone.notifications">
              <span>Recibir notificaciones</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" (click)="closeModal()">Cancelar</button>
          <button class="save-btn" (click)="saveZone()" [disabled]="!newZone.name">Guardar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .safe-zones-container {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }

    .safe-zones-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .safe-zones-header h2 {
      color: var(--text-primary);
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }

    .add-zone-btn {
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

    .add-zone-btn:hover {
      background: #0056b3;
      transform: translateY(-1px);
    }

    .zones-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 32px;
    }

    .zone-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all var(--transition-fast);
    }

    .zone-card:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-1px);
    }

    .zone-card.active {
      border-color: var(--success-color);
      background: rgba(52, 199, 89, 0.1);
    }

    .zone-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .zone-icon {
      width: 40px;
      height: 40px;
      background: var(--primary-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
    }

    .zone-details h4 {
      color: var(--text-primary);
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    .zone-details p {
      color: var(--text-secondary);
      font-size: 12px;
      margin: 0 0 4px 0;
    }

    .zone-status {
      background: rgba(142, 142, 147, 0.2);
      color: var(--text-tertiary);
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 500;
    }

    .zone-status.active {
      background: rgba(52, 199, 89, 0.2);
      color: var(--success-color);
    }

    .zone-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      width: 36px;
      height: 36px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }

    .action-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .action-btn.danger {
      color: var(--error-color);
    }

    .action-btn.danger:hover {
      background: rgba(255, 59, 48, 0.1);
      border-color: rgba(255, 59, 48, 0.3);
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
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
    }

    .empty-state h3 {
      color: var(--text-primary);
      font-size: 20px;
      margin: 0 0 8px 0;
    }

    .empty-state p {
      margin: 0 0 24px 0;
      line-height: 1.5;
    }

    .add-first-zone-btn {
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

    .add-first-zone-btn:hover {
      background: #0056b3;
      transform: translateY(-1px);
    }

    .recent-alerts {
      margin-top: 32px;
    }

    .recent-alerts h3 {
      color: var(--text-primary);
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .alert-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .alert-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .alert-icon.entered {
      background: rgba(52, 199, 89, 0.2);
      color: var(--success-color);
    }

    .alert-icon.exited {
      background: rgba(255, 149, 10, 0.2);
      color: var(--warning-color);
    }

    .alert-icon.warning {
      background: rgba(255, 59, 48, 0.2);
      color: var(--error-color);
    }

    .alert-content p {
      color: var(--text-primary);
      font-size: 14px;
      margin: 0 0 2px 0;
    }

    .alert-time {
      color: var(--text-secondary);
      font-size: 12px;
    }

    /* Modal styles */
    .add-zone-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      opacity: 0;
      visibility: hidden;
      transition: all var(--transition-normal);
    }

    .add-zone-modal.show {
      opacity: 1;
      visibility: visible;
    }

    .modal-content {
      background: var(--glass-primary);
      border: 1px solid var(--liquid-glass-border);
      border-radius: 24px;
      width: 90%;
      max-width: 400px;
      backdrop-filter: blur(30px);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .modal-header h3 {
      color: var(--text-primary);
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
    }

    .modal-body {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 14px;
    }

    .form-group input::placeholder {
      color: var(--text-secondary);
    }

    .checkbox-label {
      display: flex !important;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      width: auto;
      margin: 0;
    }

    .modal-footer {
      display: flex;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .cancel-btn,
    .save-btn {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .cancel-btn {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-secondary);
    }

    .cancel-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .save-btn {
      background: var(--primary-color);
      color: white;
    }

    .save-btn:hover:not(:disabled) {
      background: #0056b3;
    }

    .save-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SafeZonesComponent implements OnInit {
  @Input() currentPet: PetData | null = null;
  @Output() toggleSafeZoneMap = new EventEmitter<boolean>();
  
  showAddZoneModal = false;
  showingZoneOnMap = false;
  
  safeZones: SafeZone[] = [
    {
      id: '1',
      name: 'Casa',
      coordinates: [-3.7038, 40.4168],
      radius: 50,
      type: 'home',
      isActive: true,
      createdAt: new Date(),
      notifications: true
    },
    {
      id: '2',
      name: 'Parque del Retiro',
      coordinates: [-3.6844, 40.4153],
      radius: 100,
      type: 'park',
      isActive: true,
      createdAt: new Date(),
      notifications: true
    }
  ];

  locationAlerts: LocationAlert[] = [
    {
      id: '1',
      petId: 1,
      type: 'entered',
      zoneName: 'Casa',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      message: 'Max ha entrado en la zona segura: Casa'
    },
    {
      id: '2',
      petId: 1,
      type: 'exited',
      zoneName: 'Parque del Retiro',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      message: 'Max ha salido de la zona segura: Parque del Retiro'
    }
  ];

  newZone: Partial<SafeZone> = {
    name: '',
    type: 'home',
    radius: 50,
    notifications: true
  };

  ngOnInit() {
    // Filtrar alertas por la mascota actual si está disponible
    if (this.currentPet) {
      this.locationAlerts = this.locationAlerts.filter(alert => alert.petId === this.currentPet!.id);
    }
  }

  toggleZone(zone: SafeZone) {
    zone.isActive = !zone.isActive;
    console.log(`Zona ${zone.name} ${zone.isActive ? 'activada' : 'desactivada'}`);
  }

  editZone(zone: SafeZone) {
    console.log('Editando zona:', zone.name);
    // Aquí implementarías la lógica de edición
  }

  deleteZone(zone: SafeZone) {
    const confirmDelete = confirm(`¿Estás seguro de que quieres eliminar la zona "${zone.name}"?`);
    if (confirmDelete) {
      this.safeZones = this.safeZones.filter(z => z.id !== zone.id);
      console.log('Zona eliminada:', zone.name);
    }
  }

  closeModal() {
    this.showAddZoneModal = false;
    this.newZone = {
      name: '',
      type: 'home',
      radius: 50,
      notifications: true
    };
  }

  saveZone() {
    if (this.newZone.name) {
      const zone: SafeZone = {
        id: Date.now().toString(),
        name: this.newZone.name,
        coordinates: this.currentPet?.coordinates || [-3.7038, 40.4168],
        radius: this.newZone.radius || 50,
        type: this.newZone.type || 'custom',
        isActive: true,
        createdAt: new Date(),
        notifications: this.newZone.notifications || false
      };
      
      this.safeZones.push(zone);
      console.log('Nueva zona creada:', zone);
      this.closeModal();
    }
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    
    const days = Math.floor(hours / 24);
    return `Hace ${days} días`;
  }

  toggleSafeZoneOnMap() {
    this.showingZoneOnMap = !this.showingZoneOnMap;
    this.toggleSafeZoneMap.emit(this.showingZoneOnMap);
    console.log('Toggling safe zone on map:', this.showingZoneOnMap);
  }
}
