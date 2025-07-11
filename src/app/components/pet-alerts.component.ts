import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PetData } from '../services/pet-selection.service';

export interface Alert {
  id: string;
  petId: number;
  type: 'safe_zone' | 'battery' | 'offline' | 'speed' | 'location';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  location?: string;
  actionRequired?: boolean;
}

@Component({
  selector: 'app-pet-alerts',
  template: `
    <div class="pet-alerts-container">
      <div class="alerts-header">
        <h2>Alertas de {{ currentPet?.name || 'Mascota' }}</h2>
        <div class="alerts-actions">
          <button class="mark-all-read-btn" (click)="markAllAsRead()" [disabled]="unreadCount === 0">
            <i class="fas fa-check-double"></i>
            <span>Marcar como leídas</span>
          </button>
        </div>
      </div>

      <!-- Estadísticas de alertas -->
      <div class="alerts-stats">
        <div class="stat-card">
          <div class="stat-icon critical">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div class="stat-info">
            <h4>{{ criticalCount }}</h4>
            <p>Críticas</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon high">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <div class="stat-info">
            <h4>{{ highCount }}</h4>
            <p>Importantes</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon medium">
            <i class="fas fa-info-circle"></i>
          </div>
          <div class="stat-info">
            <h4>{{ mediumCount }}</h4>
            <p>Moderadas</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon unread">
            <i class="fas fa-bell"></i>
          </div>
          <div class="stat-info">
            <h4>{{ unreadCount }}</h4>
            <p>Sin leer</p>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="alerts-filters">
        <button class="filter-btn" [class.active]="activeFilter === 'all'" (click)="setFilter('all')">
          Todas ({{ alerts.length }})
        </button>
        <button class="filter-btn" [class.active]="activeFilter === 'unread'" (click)="setFilter('unread')">
          Sin leer ({{ unreadCount }})
        </button>
        <button class="filter-btn" [class.active]="activeFilter === 'critical'" (click)="setFilter('critical')">
          Críticas ({{ criticalCount }})
        </button>
        <button class="filter-btn" [class.active]="activeFilter === 'safe_zone'" (click)="setFilter('safe_zone')">
          Zonas Seguras
        </button>
      </div>

      <!-- Lista de alertas -->
      <div class="alerts-list" *ngIf="filteredAlerts.length > 0">
        <div class="alert-item" 
             *ngFor="let alert of filteredAlerts" 
             [class.unread]="!alert.isRead"
             [class]="alert.severity"
             (click)="markAsRead(alert)">
          <div class="alert-icon" [class]="alert.severity">
            <i class="fas" 
               [class.fa-shield-alt]="alert.type === 'safe_zone'"
               [class.fa-battery-quarter]="alert.type === 'battery'"
               [class.fa-wifi]="alert.type === 'offline'"
               [class.fa-tachometer-alt]="alert.type === 'speed'"
               [class.fa-map-marker-alt]="alert.type === 'location'"></i>
          </div>
          <div class="alert-content">
            <div class="alert-header">
              <h4>{{ alert.title }}</h4>
              <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
            </div>
            <p class="alert-message">{{ alert.message }}</p>
            <div class="alert-location" *ngIf="alert.location">
              <i class="fas fa-map-marker-alt"></i>
              <span>{{ alert.location }}</span>
            </div>
            <div class="alert-actions" *ngIf="alert.actionRequired">
              <button class="action-btn primary" (click)="takeAction(alert); $event.stopPropagation()">
                Revisar
              </button>
            </div>
          </div>
          <div class="alert-status" *ngIf="!alert.isRead">
            <div class="unread-dot"></div>
          </div>
        </div>
      </div>

      <!-- Estado vacío -->
      <div class="empty-alerts" *ngIf="filteredAlerts.length === 0">
        <div class="empty-icon">
          <i class="fas fa-bell-slash"></i>
        </div>
        <h3>No hay alertas</h3>
        <p *ngIf="activeFilter === 'all'">{{ currentPet?.name || 'Tu mascota' }} está segura y todo funciona correctamente.</p>
        <p *ngIf="activeFilter === 'unread'">No tienes alertas sin leer.</p>
        <p *ngIf="activeFilter === 'critical'">No hay alertas críticas en este momento.</p>
        <p *ngIf="activeFilter === 'safe_zone'">No hay alertas de zonas seguras.</p>
      </div>

      <!-- Configuración de alertas -->
      <div class="alerts-settings">
        <h3>Configuración de Alertas</h3>
        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-info">
              <h4>Zonas Seguras</h4>
              <p>Recibir alertas cuando la mascota entre o salga de zonas seguras</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [(ngModel)]="alertSettings.safeZones" (change)="updateSettings()">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <h4>Batería Baja</h4>
              <p>Notificar cuando la batería del dispositivo esté por debajo del 20%</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [(ngModel)]="alertSettings.lowBattery" (change)="updateSettings()">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <h4>Desconexión</h4>
              <p>Alertar si el dispositivo pierde conexión por más de 10 minutos</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [(ngModel)]="alertSettings.offline" (change)="updateSettings()">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <h4>Velocidad Alta</h4>
              <p>Notificar si la mascota se mueve a velocidades inusuales</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [(ngModel)]="alertSettings.highSpeed" (change)="updateSettings()">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pet-alerts-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    .alerts-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .alerts-header h2 {
      color: var(--text-primary);
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }

    .mark-all-read-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 14px;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .mark-all-read-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.15);
    }

    .mark-all-read-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .alerts-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: white;
    }

    .stat-icon.critical { background: var(--error-color); }
    .stat-icon.high { background: var(--warning-color); }
    .stat-icon.medium { background: var(--info-color); }
    .stat-icon.unread { background: var(--primary-color); }

    .stat-info h4 {
      color: var(--text-primary);
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 2px 0;
    }

    .stat-info p {
      color: var(--text-secondary);
      font-size: 12px;
      margin: 0;
    }

    .alerts-filters {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .filter-btn {
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      color: var(--text-secondary);
      font-size: 14px;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .filter-btn.active {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }

    .filter-btn:hover:not(.active) {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 32px;
    }

    .alert-item {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      transition: all var(--transition-fast);
      position: relative;
    }

    .alert-item:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-1px);
    }

    .alert-item.unread {
      border-color: var(--primary-color);
      background: rgba(0, 122, 255, 0.05);
    }

    .alert-item.critical {
      border-color: var(--error-color);
    }

    .alert-item.high {
      border-color: var(--warning-color);
    }

    .alert-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
      flex-shrink: 0;
    }

    .alert-icon.critical { background: var(--error-color); }
    .alert-icon.high { background: var(--warning-color); }
    .alert-icon.medium { background: var(--info-color); }
    .alert-icon.low { background: var(--text-tertiary); }

    .alert-content {
      flex: 1;
    }

    .alert-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .alert-header h4 {
      color: var(--text-primary);
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }

    .alert-time {
      color: var(--text-secondary);
      font-size: 12px;
    }

    .alert-message {
      color: var(--text-secondary);
      font-size: 14px;
      margin: 0 0 8px 0;
      line-height: 1.4;
    }

    .alert-location {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-tertiary);
      font-size: 12px;
      margin-bottom: 8px;
    }

    .alert-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .action-btn.primary {
      background: var(--primary-color);
      color: white;
    }

    .action-btn.primary:hover {
      background: #0056b3;
    }

    .alert-status {
      position: absolute;
      top: 16px;
      right: 16px;
    }

    .unread-dot {
      width: 8px;
      height: 8px;
      background: var(--primary-color);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .empty-alerts {
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
      color: var(--text-tertiary);
    }

    .empty-alerts h3 {
      color: var(--text-primary);
      font-size: 20px;
      margin: 0 0 8px 0;
    }

    .alerts-settings {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .alerts-settings h3 {
      color: var(--text-primary);
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }

    .settings-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
    }

    .setting-info h4 {
      color: var(--text-primary);
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    .setting-info p {
      color: var(--text-secondary);
      font-size: 14px;
      margin: 0;
      line-height: 1.4;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 24px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 255, 0.2);
      transition: .4s;
      border-radius: 24px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: var(--primary-color);
    }

    input:checked + .slider:before {
      transform: translateX(24px);
    }

    @media (max-width: 768px) {
      .alerts-header {
        flex-direction: column;
        align-items: stretch;
      }

      .alerts-stats {
        grid-template-columns: repeat(2, 1fr);
      }

      .alert-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .setting-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PetAlertsComponent implements OnInit {
  @Input() currentPet: PetData | null = null;
  
  activeFilter: 'all' | 'unread' | 'critical' | 'safe_zone' = 'all';
  filteredAlerts: Alert[] = [];
  
  alertSettings = {
    safeZones: true,
    lowBattery: true,
    offline: true,
    highSpeed: false
  };

  // Alertas de ejemplo
  alerts: Alert[] = [
    {
      id: '1',
      petId: 2,
      type: 'safe_zone',
      severity: 'medium',
      title: 'Zona Segura - Salida',
      message: 'Luna ha salido de la zona segura "Casa"',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      isRead: false,
      location: 'Plaza Mayor, Madrid',
      actionRequired: true
    },
    {
      id: '2',
      petId: 2,
      type: 'battery',
      severity: 'high',
      title: 'Batería Baja',
      message: 'La batería del dispositivo de Luna está al 15%',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      isRead: false,
      actionRequired: true
    },
    {
      id: '3',
      petId: 1,
      type: 'safe_zone',
      severity: 'low',
      title: 'Zona Segura - Entrada',
      message: 'Max ha entrado en la zona segura "Parque"',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isRead: true,
      location: 'Parque Central, Madrid'
    }
  ];

  get unreadCount(): number {
    return this.alerts.filter(alert => !alert.isRead && (!this.currentPet || alert.petId === this.currentPet.id)).length;
  }

  get criticalCount(): number {
    return this.alerts.filter(alert => alert.severity === 'critical' && (!this.currentPet || alert.petId === this.currentPet.id)).length;
  }

  get highCount(): number {
    return this.alerts.filter(alert => alert.severity === 'high' && (!this.currentPet || alert.petId === this.currentPet.id)).length;
  }

  get mediumCount(): number {
    return this.alerts.filter(alert => alert.severity === 'medium' && (!this.currentPet || alert.petId === this.currentPet.id)).length;
  }

  ngOnInit() {
    this.filterAlerts();
  }

  setFilter(filter: 'all' | 'unread' | 'critical' | 'safe_zone') {
    this.activeFilter = filter;
    this.filterAlerts();
  }

  private filterAlerts() {
    let filtered = this.alerts.filter(alert => !this.currentPet || alert.petId === this.currentPet.id);
    
    switch (this.activeFilter) {
      case 'unread':
        filtered = filtered.filter(alert => !alert.isRead);
        break;
      case 'critical':
        filtered = filtered.filter(alert => alert.severity === 'critical');
        break;
      case 'safe_zone':
        filtered = filtered.filter(alert => alert.type === 'safe_zone');
        break;
    }
    
    this.filteredAlerts = filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  markAsRead(alert: Alert) {
    alert.isRead = true;
    this.filterAlerts();
  }

  markAllAsRead() {
    this.alerts.forEach(alert => {
      if (!this.currentPet || alert.petId === this.currentPet.id) {
        alert.isRead = true;
      }
    });
    this.filterAlerts();
  }

  takeAction(alert: Alert) {
    console.log('Taking action for alert:', alert);
    // Aquí implementarías acciones específicas según el tipo de alerta
  }

  updateSettings() {
    console.log('Alert settings updated:', this.alertSettings);
    // Aquí guardarías la configuración
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours}h`;
    
    const days = Math.floor(hours / 24);
    return `Hace ${days} días`;
  }
}
