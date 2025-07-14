import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PetData, IMUData, ActivityRecord, PetSelectionService } from '../services/pet-selection.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-imu-monitor',
  template: `
    <div class="imu-monitor-container">
      <!-- Header del Monitor IMU -->
      <div class="imu-header">
        <div class="header-icon">
          <i class="fas fa-microchip"></i>
        </div>
        <div class="header-info">
          <h3>Monitor IMU - Sensor de Movimiento</h3>
          <p *ngIf="currentPet">{{ currentPet.name }} • {{ getDeviceStatus() }}</p>
        </div>
        <div class="status-indicator" [class.online]="isOnline" [class.offline]="!isOnline">
          <div class="status-dot"></div>
          <span>{{ isOnline ? 'Conectado' : 'Desconectado' }}</span>
        </div>
      </div>

      <!-- Datos del IMU en Tiempo Real -->
      <div class="imu-data-section" *ngIf="imuData">
        <div class="section-title">
          <i class="fas fa-chart-line"></i>
          <h4>Datos en Tiempo Real</h4>
          <span class="timestamp">{{ formatTimestamp(imuData.timestamp) }}</span>
        </div>
        
        <div class="sensor-grid">
          <!-- Acelerómetro -->
          <div class="sensor-card accelerometer">
            <div class="sensor-header">
              <i class="fas fa-arrows-alt"></i>
              <h5>Acelerómetro</h5>
              <span class="magnitude">{{ imuData.magnitudes.accelerometer.toFixed(2) }}g</span>
            </div>
            <div class="sensor-values">
              <div class="axis-value x">
                <span class="axis">X:</span>
                <span class="value">{{ imuData.accelerometer.x.toFixed(3) }}g</span>
                <div class="bar">
                  <div class="fill" [style.width.%]="getAccelBarWidth('x')"></div>
                </div>
              </div>
              <div class="axis-value y">
                <span class="axis">Y:</span>
                <span class="value">{{ imuData.accelerometer.y.toFixed(3) }}g</span>
                <div class="bar">
                  <div class="fill" [style.width.%]="getAccelBarWidth('y')"></div>
                </div>
              </div>
              <div class="axis-value z">
                <span class="axis">Z:</span>
                <span class="value">{{ imuData.accelerometer.z.toFixed(3) }}g</span>
                <div class="bar">
                  <div class="fill" [style.width.%]="getAccelBarWidth('z')"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Giroscopio -->
          <div class="sensor-card gyroscope">
            <div class="sensor-header">
              <i class="fas fa-sync-alt"></i>
              <h5>Giroscopio</h5>
              <span class="magnitude">{{ imuData.magnitudes.gyroscope.toFixed(2) }}°/s</span>
            </div>
            <div class="sensor-values">
              <div class="axis-value x">
                <span class="axis">X:</span>
                <span class="value">{{ imuData.gyroscope.x.toFixed(2) }}°/s</span>
                <div class="bar">
                  <div class="fill" [style.width.%]="getGyroBarWidth('x')"></div>
                </div>
              </div>
              <div class="axis-value y">
                <span class="axis">Y:</span>
                <span class="value">{{ imuData.gyroscope.y.toFixed(2) }}°/s</span>
                <div class="bar">
                  <div class="fill" [style.width.%]="getGyroBarWidth('y')"></div>
                </div>
              </div>
              <div class="axis-value z">
                <span class="axis">Z:</span>
                <span class="value">{{ imuData.gyroscope.z.toFixed(2) }}°/s</span>
                <div class="bar">
                  <div class="fill" [style.width.%]="getGyroBarWidth('z')"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Temperatura -->
          <div class="sensor-card temperature">
            <div class="sensor-header">
              <i class="fas fa-thermometer-half"></i>
              <h5>Temperatura</h5>
              <span class="magnitude">{{ imuData.temperature.toFixed(1) }}°C</span>
            </div>
            <div class="temperature-display">
              <div class="temp-circle" [style.background]="getTemperatureColor()">
                <span class="temp-value">{{ imuData.temperature.toFixed(1) }}°</span>
              </div>
              <div class="temp-status">
                <span [class]="getTemperatureStatus().class">{{ getTemperatureStatus().text }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estado de Actividad Actual -->
      <div class="activity-section" *ngIf="currentPet">
        <div class="section-title">
          <i class="fas fa-running"></i>
          <h4>Estado de Actividad</h4>
        </div>
        
        <div class="activity-current">
          <div class="activity-icon" [class]="getActivityClass()">
            <i class="fas" [class]="getActivityIcon()"></i>
          </div>
          <div class="activity-info">
            <h5>{{ getActivityText() }}</h5>
            <p *ngIf="lastActivityRecord">
              Confianza: {{ (lastActivityRecord.confidence * 100).toFixed(1) }}%
              <span *ngIf="lastActivityRecord.imuMagnitudes">
                • Accel: {{ lastActivityRecord.imuMagnitudes.accelerometer.toFixed(1) }}g
                • Gyro: {{ lastActivityRecord.imuMagnitudes.gyroscope.toFixed(1) }}°/s
              </span>
            </p>
          </div>
        </div>
      </div>

      <!-- Historial de Actividad -->
      <div class="history-section" *ngIf="activityHistory.length > 0">
        <div class="section-title">
          <i class="fas fa-history"></i>
          <h4>Historial Reciente</h4>
        </div>
        
        <div class="activity-timeline">
          <div class="timeline-item" *ngFor="let record of getRecentHistory()" [class]="record.state">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="activity-name">{{ getActivityText(record.state) }}</span>
                <span class="duration" *ngIf="record.endTime">{{ record.duration }}min</span>
                <span class="confidence">{{ (record.confidence * 100).toFixed(0) }}%</span>
              </div>
              <div class="timeline-time">
                {{ formatTime(record.startTime) }}
                <span *ngIf="record.endTime"> - {{ formatTime(record.endTime) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estadísticas Diarias -->
      <div class="stats-section">
        <div class="section-title">
          <i class="fas fa-chart-pie"></i>
          <h4>Estadísticas del Día</h4>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card lying">
            <i class="fas fa-bed"></i>
            <div class="stat-info">
              <span class="stat-value">{{ stats.lying }}min</span>
              <span class="stat-label">Descansando</span>
            </div>
          </div>
          <div class="stat-card standing">
            <i class="fas fa-male"></i>
            <div class="stat-info">
              <span class="stat-value">{{ stats.standing }}min</span>
              <span class="stat-label">De pie</span>
            </div>
          </div>
          <div class="stat-card walking">
            <i class="fas fa-walking"></i>
            <div class="stat-info">
              <span class="stat-value">{{ stats.walking }}min</span>
              <span class="stat-label">Caminando</span>
            </div>
          </div>
          <div class="stat-card running">
            <i class="fas fa-running"></i>
            <div class="stat-info">
              <span class="stat-value">{{ stats.running }}min</span>
              <span class="stat-label">Corriendo</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Estado sin datos -->
      <div class="no-data-state" *ngIf="!imuData && isOnline">
        <div class="no-data-icon">
          <i class="fas fa-satellite-dish"></i>
        </div>
        <h4>Esperando datos del sensor...</h4>
        <p>El sensor IMU está conectado pero aún no se han recibido datos.</p>
      </div>

      <div class="offline-state" *ngIf="!isOnline">
        <div class="offline-icon">
          <i class="fas fa-wifi-slash"></i>
        </div>
        <h4>Sensor desconectado</h4>
        <p>No se puede conectar con el dispositivo ESP32C6.</p>
      </div>
    </div>
  `,
  styles: [`
    .imu-monitor-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
      color: var(--text-primary);
    }

    .imu-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: var(--liquid-glass-bg);
      border: 1px solid var(--liquid-glass-border);
      border-radius: 20px;
      margin-bottom: 24px;
      backdrop-filter: blur(var(--liquid-glass-blur));
    }

    .header-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #007AFF, #5AC8FA);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
    }

    .header-info h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    .header-info p {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0;
    }

    .status-indicator {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-indicator.online {
      background: rgba(52, 199, 89, 0.1);
      color: var(--success-color);
    }

    .status-indicator.offline {
      background: rgba(255, 59, 48, 0.1);
      color: var(--error-color);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .section-title i {
      color: var(--primary-color);
      font-size: 16px;
    }

    .section-title h4 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
      flex: 1;
    }

    .timestamp {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .imu-data-section {
      background: var(--liquid-glass-bg);
      border: 1px solid var(--liquid-glass-border);
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 24px;
      backdrop-filter: blur(var(--liquid-glass-blur));
    }

    .sensor-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .sensor-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 20px;
    }

    .sensor-card.temperature {
      grid-column: span 2;
    }

    .sensor-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .sensor-header i {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
    }

    .accelerometer .sensor-header i {
      background: linear-gradient(135deg, #FF6B35, #F7931E);
    }

    .gyroscope .sensor-header i {
      background: linear-gradient(135deg, #9B59B6, #8E44AD);
    }

    .temperature .sensor-header i {
      background: linear-gradient(135deg, #E74C3C, #C0392B);
    }

    .sensor-header h5 {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
      flex: 1;
    }

    .magnitude {
      font-size: 12px;
      font-weight: 600;
      color: var(--primary-color);
      background: rgba(0, 122, 255, 0.1);
      padding: 4px 8px;
      border-radius: 8px;
    }

    .sensor-values {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .axis-value {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .axis {
      font-weight: 600;
      width: 20px;
      color: var(--text-secondary);
    }

    .value {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
      font-size: 12px;
      width: 70px;
      text-align: right;
    }

    .bar {
      flex: 1;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .bar .fill {
      height: 100%;
      background: linear-gradient(90deg, var(--success-color), var(--warning-color), var(--error-color));
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .temperature-display {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .temp-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
    }

    .temp-value {
      font-size: 18px;
    }

    .temp-status span {
      font-size: 14px;
      font-weight: 500;
      padding: 4px 12px;
      border-radius: 8px;
    }

    .temp-status .normal {
      background: rgba(52, 199, 89, 0.1);
      color: var(--success-color);
    }

    .temp-status .warm {
      background: rgba(255, 149, 10, 0.1);
      color: var(--warning-color);
    }

    .temp-status .hot {
      background: rgba(255, 59, 48, 0.1);
      color: var(--error-color);
    }

    .activity-section {
      background: var(--liquid-glass-bg);
      border: 1px solid var(--liquid-glass-border);
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 24px;
      backdrop-filter: blur(var(--liquid-glass-blur));
    }

    .activity-current {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
    }

    .activity-icon {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
    }

    .activity-icon.lying {
      background: linear-gradient(135deg, #34495E, #2C3E50);
    }

    .activity-icon.standing {
      background: linear-gradient(135deg, #3498DB, #2980B9);
    }

    .activity-icon.walking {
      background: linear-gradient(135deg, #F39C12, #E67E22);
    }

    .activity-icon.running {
      background: linear-gradient(135deg, #E74C3C, #C0392B);
    }

    .activity-info h5 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    .activity-info p {
      font-size: 12px;
      color: var(--text-secondary);
      margin: 0;
    }

    .history-section {
      background: var(--liquid-glass-bg);
      border: 1px solid var(--liquid-glass-border);
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 24px;
      backdrop-filter: blur(var(--liquid-glass-blur));
    }

    .activity-timeline {
      position: relative;
      padding-left: 20px;
    }

    .activity-timeline::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--primary-color);
      opacity: 0.3;
    }

    .timeline-item {
      position: relative;
      margin-bottom: 16px;
      padding-left: 24px;
    }

    .timeline-dot {
      position: absolute;
      left: -7px;
      top: 6px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid var(--primary-color);
      background: var(--surface-primary);
    }

    .timeline-item.lying .timeline-dot { border-color: #34495E; }
    .timeline-item.standing .timeline-dot { border-color: #3498DB; }
    .timeline-item.walking .timeline-dot { border-color: #F39C12; }
    .timeline-item.running .timeline-dot { border-color: #E74C3C; }

    .timeline-content {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 12px 16px;
    }

    .timeline-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }

    .activity-name {
      font-weight: 500;
      flex: 1;
    }

    .duration, .confidence {
      font-size: 12px;
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .timeline-time {
      font-size: 11px;
      color: var(--text-tertiary);
    }

    .stats-section {
      background: var(--liquid-glass-bg);
      border: 1px solid var(--liquid-glass-border);
      border-radius: 20px;
      padding: 24px;
      backdrop-filter: blur(var(--liquid-glass-blur));
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .stat-card i {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
    }

    .stat-card.lying i { background: #34495E; }
    .stat-card.standing i { background: #3498DB; }
    .stat-card.walking i { background: #F39C12; }
    .stat-card.running i { background: #E74C3C; }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .no-data-state, .offline-state {
      text-align: center;
      padding: 40px;
      color: var(--text-secondary);
    }

    .no-data-icon, .offline-icon {
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

    .no-data-state h4, .offline-state h4 {
      color: var(--text-primary);
      margin: 0 0 8px 0;
    }

    @media (max-width: 768px) {
      .sensor-grid {
        grid-template-columns: 1fr;
      }
      
      .sensor-card.temperature {
        grid-column: span 1;
      }
      
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class ImuMonitorComponent implements OnInit, OnDestroy {
  @Input() currentPet: PetData | null = null;
  
  imuData: IMUData | null = null;
  activityHistory: ActivityRecord[] = [];
  lastActivityRecord: ActivityRecord | null = null;
  stats = { lying: 0, standing: 0, walking: 0, running: 0, total: 0 };
  isOnline = false;
  
  private subscription: Subscription = new Subscription();

  constructor(private petService: PetSelectionService) {}

  ngOnInit() {
    this.updateData();
    
    // Suscribirse a cambios de la mascota seleccionada
    this.subscription.add(
      this.petService.selectedPet$.subscribe(pet => {
        this.currentPet = pet;
        this.updateData();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private updateData() {
    if (!this.currentPet) return;
    
    this.imuData = this.petService.getIMUData(this.currentPet.id);
    this.activityHistory = this.petService.getActivityHistory(this.currentPet.id);
    this.stats = this.petService.getActivityStats(this.currentPet.id);
    this.isOnline = this.currentPet.status === 'online';
    
    if (this.activityHistory.length > 0) {
      this.lastActivityRecord = this.activityHistory[this.activityHistory.length - 1];
    }
  }

  getDeviceStatus(): string {
    return this.imuData ? this.imuData.deviceId : 'ESP32C6_MAX';
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  getAccelBarWidth(axis: 'x' | 'y' | 'z'): number {
    if (!this.imuData) return 0;
    const value = Math.abs(this.imuData.accelerometer[axis]);
    return Math.min(100, (value / 2.0) * 100); // Escala hasta 2g
  }

  getGyroBarWidth(axis: 'x' | 'y' | 'z'): number {
    if (!this.imuData) return 0;
    const value = Math.abs(this.imuData.gyroscope[axis]);
    return Math.min(100, (value / 250.0) * 100); // Escala hasta 250°/s
  }

  getTemperatureColor(): string {
    if (!this.imuData) return '#3498DB';
    const temp = this.imuData.temperature;
    
    if (temp < 20) return 'linear-gradient(135deg, #3498DB, #2980B9)';
    if (temp < 30) return 'linear-gradient(135deg, #27AE60, #229954)';
    if (temp < 40) return 'linear-gradient(135deg, #F39C12, #E67E22)';
    return 'linear-gradient(135deg, #E74C3C, #C0392B)';
  }

  getTemperatureStatus(): { class: string, text: string } {
    if (!this.imuData) return { class: 'normal', text: 'Normal' };
    const temp = this.imuData.temperature;
    
    if (temp < 30) return { class: 'normal', text: 'Normal' };
    if (temp < 40) return { class: 'warm', text: 'Templado' };
    return { class: 'hot', text: 'Caliente' };
  }

  getActivityClass(): string {
    return this.currentPet?.activityState || 'lying';
  }

  getActivityIcon(): string {
    switch (this.currentPet?.activityState) {
      case 'lying': return 'fa-bed';
      case 'standing': return 'fa-male';
      case 'walking': return 'fa-walking';
      case 'running': return 'fa-running';
      default: return 'fa-question';
    }
  }

  getActivityText(state?: string): string {
    const activityState = state || this.currentPet?.activityState;
    switch (activityState) {
      case 'lying': return 'Descansando';
      case 'standing': return 'De pie';
      case 'walking': return 'Caminando';
      case 'running': return 'Corriendo';
      default: return 'Desconocido';
    }
  }

  getRecentHistory(): ActivityRecord[] {
    return this.activityHistory.slice(-10).reverse();
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}
