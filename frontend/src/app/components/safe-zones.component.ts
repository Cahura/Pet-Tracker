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
  petId: number;
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
      <div class="add-modal-content liquid-glass" (click)="$event.stopPropagation()">
        <div class="add-modal-header">
          <div class="header-icon">
            <i class="fas fa-plus"></i>
          </div>
          <div class="header-text">
            <h3>Añadir Zona Segura</h3>
            <p>Crea una nueva zona de seguridad</p>
          </div>
          <button class="close-btn elegant" (click)="closeModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="add-modal-body">
          <!-- Mini-mapa para seleccionar ubicación -->
          <div class="location-selector">
            <h4>Selecciona la ubicación</h4>
            <div class="mini-map-container">
              <div class="mini-map" id="addZoneMiniMap">
                <div class="map-loading">
                  <i class="fas fa-map-marked-alt"></i>
                  <p>Cargando mapa...</p>
                </div>
              </div>
              <div class="map-instructions">
                <i class="fas fa-info-circle"></i>
                <span>Haz clic en el mapa para seleccionar la ubicación de tu zona segura</span>
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <div class="form-grid">
              <div class="form-group">
                <label>Mascota</label>
                <select [(ngModel)]="newZone.petId" class="elegant-select liquid-glass">
                  <option value="1">Max</option>
                  <option value="2">Luna</option>
                  <option value="3">Rocky</option>
                  <option value="4">Mia</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>Tipo de zona</label>
                <select [(ngModel)]="newZone.type" class="elegant-select liquid-glass">
                  <option value="home">🏠 Casa</option>
                  <option value="park">🌳 Parque</option>
                  <option value="work">💼 Trabajo</option>
                  <option value="custom">📍 Personalizada</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>Radio (metros)</label>
                <div class="range-input-group">
                  <input type="range" [(ngModel)]="newZone.radius" 
                         min="10" max="1000" step="10" 
                         class="elegant-range">
                  <span class="range-value">{{ newZone.radius }}m</span>
                </div>
              </div>
              
              <div class="form-group full-width">
                <div class="toggle-item">
                  <div class="toggle-info">
                    <span class="toggle-title">Recibir notificaciones</span>
                    <span class="toggle-desc">Alertas cuando entre/salga de la zona</span>
                  </div>
                  <label class="elegant-toggle">
                    <input type="checkbox" [(ngModel)]="newZone.notifications">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="add-modal-footer">
          <button class="btn-secondary elegant" (click)="closeModal()">
            <i class="fas fa-times"></i>
            <span>Cancelar</span>
          </button>
          <button class="btn-primary elegant" (click)="saveZone()" [disabled]="!newZone.coordinates">
            <i class="fas fa-check"></i>
            <span>Guardar Zona</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal elegante para editar zona -->
    <div class="edit-zone-modal" [class.show]="showEditZoneModal" (click)="closeEditModal()">
      <div class="edit-modal-content liquid-glass" (click)="$event.stopPropagation()">
        <div class="edit-modal-header">
          <div class="header-icon">
            <i class="fas fa-edit"></i>
          </div>
          <div class="header-text">
            <h3>Editar Zona Segura</h3>
            <p>Personaliza tu zona de seguridad</p>
          </div>
          <button class="close-btn elegant" (click)="closeEditModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="edit-modal-body" *ngIf="editingZone">
          <div class="form-section">
            <h4>Información Básica</h4>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>Nombre de la zona</label>
                <input type="text" [(ngModel)]="editingZone.name" 
                       placeholder="Ej: Casa, Parque, Oficina"
                       class="elegant-input">
              </div>
              
              <div class="form-group">
                <label>Tipo de zona</label>
                <select [(ngModel)]="editingZone.type" class="elegant-select">
                  <option value="home">🏠 Casa</option>
                  <option value="park">🌳 Parque</option>
                  <option value="work">💼 Trabajo</option>
                  <option value="custom">📍 Personalizada</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>Radio (metros)</label>
                <div class="range-input-group">
                  <input type="range" [(ngModel)]="editingZone.radius" 
                         min="10" max="1000" step="10" 
                         class="elegant-range">
                  <span class="range-value">{{ editingZone.radius }}m</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h4>Configuración</h4>
            <div class="toggle-group">
              <div class="toggle-item">
                <div class="toggle-info">
                  <span class="toggle-title">Zona activa</span>
                  <span class="toggle-desc">Recibir alertas para esta zona</span>
                </div>
                <label class="elegant-toggle">
                  <input type="checkbox" [(ngModel)]="editingZone.isActive">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="toggle-item">
                <div class="toggle-info">
                  <span class="toggle-title">Notificaciones</span>
                  <span class="toggle-desc">Alertas push cuando entre/salga</span>
                </div>
                <label class="elegant-toggle">
                  <input type="checkbox" [(ngModel)]="editingZone.notifications">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="form-section preview-section">
            <h4>Vista Previa</h4>
            <div class="zone-preview">
              <div class="preview-icon">
                <i class="fas" [class.fa-home]="editingZone.type === 'home'" 
                                [class.fa-tree]="editingZone.type === 'park'"
                                [class.fa-briefcase]="editingZone.type === 'work'"
                                [class.fa-map-marker-alt]="editingZone.type === 'custom'"></i>
              </div>
              <div class="preview-details">
                <h5>{{ editingZone.name || 'Nombre de zona' }}</h5>
                <p>Radio de {{ editingZone.radius }}m • {{ getZoneTypeText(editingZone.type) }}</p>
                <span class="preview-status" [class.active]="editingZone.isActive">
                  {{ editingZone.isActive ? '✓ Activa' : '○ Inactiva' }}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="edit-modal-footer">
          <button class="btn-secondary elegant" (click)="closeEditModal()">
            <i class="fas fa-times"></i>
            <span>Cancelar</span>
          </button>
          <button class="btn-primary elegant" (click)="saveEditedZone()" [disabled]="!editingZone?.name">
            <i class="fas fa-check"></i>
            <span>Guardar Cambios</span>
          </button>
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

    /* Estilos para controles de mapa */
    .map-controls {
      margin: 20px 0;
      display: flex;
      justify-content: center;
    }

    .safe-zone-map-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: var(--liquid-glass-bg);
      backdrop-filter: blur(var(--liquid-glass-blur));
      border: 1px solid var(--liquid-glass-border);
      border-radius: var(--border-radius-lg);
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition-fast);
      box-shadow: var(--liquid-glass-shadow);
    }

    .safe-zone-map-toggle:hover {
      background: var(--liquid-glass-hover);
      transform: translateY(-1px);
    }

    .safe-zone-map-toggle.active {
      background: rgba(52, 199, 89, 0.15);
      border-color: rgba(52, 199, 89, 0.3);
      color: var(--success-color);
    }

    .safe-zone-map-toggle i {
      color: var(--text-primary);
      font-size: 16px;
    }

    .safe-zone-map-toggle.active i {
      color: var(--success-color);
    }

    /* Estilos para el modal de añadir zona - estilo liquid glass elegante */
    .add-zone-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      opacity: 0;
      visibility: hidden;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: none;
    }

    .add-zone-modal.show {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    .add-modal-content {
      background: var(--liquid-glass-bg);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border: 1px solid var(--liquid-glass-border);
      border-radius: 32px;
      width: 95%;
      max-width: 520px;
      max-height: 90vh;
      overflow: hidden;
      box-shadow: 
        0 25px 70px rgba(0, 0, 0, 0.6),
        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      transform: scale(0.9) translateY(40px);
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      display: flex;
      flex-direction: column;
    }

    .add-zone-modal.show .add-modal-content {
      transform: scale(1) translateY(0);
    }

    .add-modal-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 32px 32px 0 32px;
      position: relative;
    }

    .add-modal-header .header-icon {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, var(--success-color), var(--secondary-color));
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      box-shadow: 0 8px 24px rgba(52, 199, 89, 0.3);
    }

    .add-modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 32px;
      
      /* Scrollbar liquid glass personalizado */
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }

    /* Webkit scrollbar personalizado con liquid glass */
    .add-modal-body::-webkit-scrollbar {
      width: 8px;
    }

    .add-modal-body::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 10px;
      margin: 10px 0;
    }

    .add-modal-body::-webkit-scrollbar-thumb {
      background: linear-gradient(
        180deg, 
        rgba(255, 255, 255, 0.15) 0%, 
        rgba(255, 255, 255, 0.1) 100%
      );
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .add-modal-body::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(
        180deg, 
        rgba(255, 255, 255, 0.25) 0%, 
        rgba(255, 255, 255, 0.15) 100%
      );
    }

    .add-modal-footer {
      display: flex;
      gap: 16px;
      padding: 24px 32px 32px 32px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.02) 0%,
        rgba(255, 255, 255, 0.00) 100%
      );
    }

    /* Estilos para el modal de edición elegante */
    .edit-zone-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10003;
      opacity: 0;
      visibility: hidden;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: none;
    }

    .edit-zone-modal.show {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    .edit-modal-content {
      background: var(--liquid-glass-bg);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border: 1px solid var(--liquid-glass-border);
      border-radius: 32px;
      width: 95%;
      max-width: 600px;
      max-height: 90vh;
      overflow: hidden;
      box-shadow: 0 25px 70px rgba(0, 0, 0, 0.6);
      transform: scale(0.9) translateY(40px);
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      display: flex;
      flex-direction: column;
    }

    .edit-zone-modal.show .edit-modal-content {
      transform: scale(1) translateY(0);
    }

    .edit-modal-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 32px 32px 0 32px;
      position: relative;
    }

    .header-icon {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      box-shadow: 0 8px 24px rgba(0, 122, 255, 0.3);
    }

    .header-text h3 {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 4px 0;
    }

    .header-text p {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0;
    }

    .close-btn.elegant {
      position: absolute;
      top: 24px;
      right: 24px;
      width: 36px;
      height: 36px;
      border: none;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.3s ease;
      z-index: 10;
    }

    .close-btn.elegant:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
      transform: scale(1.1);
    }

    .edit-modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 32px;
      
      /* Scrollbar liquid glass personalizado */
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }

    /* Webkit scrollbar personalizado con liquid glass para modal de edición */
    .edit-modal-body::-webkit-scrollbar {
      width: 8px;
    }

    .edit-modal-body::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 10px;
      margin: 10px 0;
    }

    .edit-modal-body::-webkit-scrollbar-thumb {
      background: linear-gradient(
        180deg, 
        rgba(255, 255, 255, 0.15) 0%, 
        rgba(255, 255, 255, 0.1) 100%
      );
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .edit-modal-body::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(
        180deg, 
        rgba(255, 255, 255, 0.25) 0%, 
        rgba(255, 255, 255, 0.15) 100%
      );
    }

    .form-section {
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.05) 0%,
        rgba(255, 255, 255, 0.02) 100%
      );
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 28px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.1),
        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    }

    .form-section h4 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 20px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .form-group.full-width {
      grid-column: span 2;
    }

    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .elegant-input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 16px;
      transition: all 0.3s ease;
    }

    .elegant-input:focus {
      outline: none;
      border-color: var(--primary-color);
      background: rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
    }

    .elegant-select {
      width: 100%;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .elegant-select:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
    }

    .range-input-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .elegant-range {
      flex: 1;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      outline: none;
      -webkit-appearance: none;
    }

    .elegant-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      background: var(--primary-color);
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
    }

    .range-value {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
      min-width: 50px;
      text-align: center;
      background: rgba(255, 255, 255, 0.05);
      padding: 4px 8px;
      border-radius: 8px;
    }

    .toggle-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .toggle-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .toggle-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .toggle-title {
      font-size: 16px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .toggle-desc {
      font-size: 13px;
      color: var(--text-tertiary);
    }

    .elegant-toggle {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 28px;
    }

    .elegant-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 255, 0.1);
      transition: 0.3s;
      border-radius: 28px;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }

    .elegant-toggle input:checked + .toggle-slider {
      background-color: var(--primary-color);
    }

    .elegant-toggle input:checked + .toggle-slider:before {
      transform: translateX(22px);
    }

    .preview-section {
      background: linear-gradient(135deg, rgba(0, 122, 255, 0.1), rgba(90, 200, 250, 0.1));
      border-color: rgba(0, 122, 255, 0.2);
    }

    .zone-preview {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .preview-icon {
      width: 48px;
      height: 48px;
      background: var(--primary-color);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
    }

    .preview-details h5 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 4px 0;
    }

    .preview-details p {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0 0 8px 0;
    }

    .preview-status {
      font-size: 12px;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-tertiary);
    }

    .preview-status.active {
      background: rgba(52, 199, 89, 0.2);
      color: var(--success-color);
    }

    .edit-modal-footer {
      display: flex;
      gap: 16px;
      padding: 24px 32px 32px 32px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.02) 0%,
        rgba(255, 255, 255, 0.00) 100%
      );
    }

    .btn-secondary.elegant,
    .btn-primary.elegant {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px 24px;
      border: none;
      border-radius: 16px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .btn-secondary.elegant {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-secondary);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn-secondary.elegant:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
      transform: translateY(-2px);
    }

    .btn-primary.elegant {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      box-shadow: 0 8px 24px rgba(0, 122, 255, 0.3);
    }

    .btn-primary.elegant:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(0, 122, 255, 0.4);
    }

    .btn-primary.elegant:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* Mini-mapa styles con liquid glass */
    .location-selector {
      margin-bottom: 24px;
    }

    .location-selector h4 {
      color: var(--text-primary);
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }

    .mini-map-container {
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      margin-bottom: 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.3),
        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    }

    .mini-map {
      width: 100%;
      height: 240px;
      background: linear-gradient(
        135deg,
        rgba(0, 122, 255, 0.05) 0%,
        rgba(90, 200, 250, 0.05) 100%
      );
      border-radius: 20px;
      position: relative;
      overflow: hidden;
      cursor: crosshair;
      transition: all 0.3s ease;
    }

    .mini-map:hover {
      background: linear-gradient(
        135deg,
        rgba(0, 122, 255, 0.08) 0%,
        rgba(90, 200, 250, 0.08) 100%
      );
    }

    .map-loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: var(--text-secondary);
    }

    .map-loading i {
      font-size: 36px;
      margin-bottom: 12px;
      display: block;
      color: var(--primary-color);
      opacity: 0.7;
    }

    .map-loading p {
      font-size: 14px;
      margin: 0;
      font-weight: 500;
    }

    .map-instructions {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      color: var(--text-secondary);
      font-size: 14px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .map-instructions i {
      color: var(--primary-color);
      font-size: 16px;
    }

    /* Liquid glass select */
    .elegant-select.liquid-glass {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: white;
    }

    .elegant-select.liquid-glass option {
      background: rgba(0, 0, 0, 0.9);
      color: white;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .edit-modal-content {
        width: 95%;
        max-height: 95vh;
        border-radius: 24px;
      }

      .edit-modal-header,
      .edit-modal-body,
      .edit-modal-footer {
        padding-left: 20px;
        padding-right: 20px;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .form-group.full-width {
        grid-column: span 1;
      }

      .edit-modal-footer {
        flex-direction: column;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SafeZonesComponent implements OnInit {
  @Input() currentPet: PetData | null = null;
  @Output() toggleSafeZoneMap = new EventEmitter<boolean>();
  
  showAddZoneModal = false;
  showEditZoneModal = false;
  showingZoneOnMap = false;
  editingZone: SafeZone | null = null;
  
  safeZones: SafeZone[] = [
    {
      id: '1',
      name: 'Casa',
      coordinates: [-3.7038, 40.4168],
      radius: 50,
      type: 'home',
      isActive: true,
      createdAt: new Date(),
      notifications: true,
      petId: 1
    },
    {
      id: '2',
      name: 'Parque del Retiro',
      coordinates: [-3.6844, 40.4153],
      radius: 100,
      type: 'park',
      isActive: true,
      createdAt: new Date(),
      notifications: true,
      petId: 1
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
    notifications: true,
    petId: 1
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
    this.editingZone = { ...zone }; // Crear una copia para editar
    this.showEditZoneModal = true;
  }

  closeEditModal() {
    this.showEditZoneModal = false;
    this.editingZone = null;
  }

  saveEditedZone() {
    if (this.editingZone && this.editingZone.name) {
      // Encontrar y actualizar la zona en la lista
      const index = this.safeZones.findIndex(z => z.id === this.editingZone!.id);
      if (index !== -1) {
        this.safeZones[index] = { ...this.editingZone };
        console.log('Zona actualizada:', this.editingZone.name);
      }
      this.closeEditModal();
    }
  }

  getZoneTypeText(type: string): string {
    switch (type) {
      case 'home': return 'Casa';
      case 'park': return 'Parque';
      case 'work': return 'Trabajo';
      case 'custom': return 'Personalizada';
      default: return 'Zona';
    }
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
      notifications: true,
      petId: 1
    };
  }

  getZoneName(type: string): string {
    switch (type) {
      case 'home': return 'Casa';
      case 'park': return 'Parque';
      case 'work': return 'Trabajo';
      default: return 'Zona Personalizada';
    }
  }

  saveZone() {
    if (this.newZone.coordinates) {
      const zone: SafeZone = {
        id: Date.now().toString(),
        name: this.getZoneName(this.newZone.type || 'custom'),
        coordinates: this.newZone.coordinates,
        radius: this.newZone.radius || 50,
        type: this.newZone.type || 'custom',
        isActive: true,
        createdAt: new Date(),
        notifications: this.newZone.notifications || false,
        petId: this.newZone.petId || 1
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
