import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PetData } from '../services/pet-selection.service';

export interface LocationHistory {
  id: string;
  petId: number;
  coordinates: [number, number];
  timestamp: Date;
  address: string;
  battery: number;
  accuracy: number;
  speed?: number;
  activity?: 'walking' | 'running' | 'resting' | 'playing';
}

export interface DailyStats {
  date: Date;
  totalDistance: number;
  activeTime: number;
  restTime: number;
  averageSpeed: number;
  locationsCount: number;
}

@Component({
  selector: 'app-pet-history',
  template: `
    <div class="pet-history-container">
      <div class="history-header">
        <h2>Historial de {{ currentPet?.name || 'Mascota' }}</h2>
        <div class="date-filters">
          <button class="filter-btn" [class.active]="activeFilter === 'today'" (click)="setFilter('today')">Hoy</button>
          <button class="filter-btn" [class.active]="activeFilter === 'week'" (click)="setFilter('week')">Esta Semana</button>
          <button class="filter-btn" [class.active]="activeFilter === 'month'" (click)="setFilter('month')">Este Mes</button>
        </div>
      </div>

      <!-- Estadísticas diarias -->
      <div class="daily-stats" *ngIf="currentDayStats">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-route"></i>
            </div>
            <div class="stat-info">
              <h4>{{ currentDayStats.totalDistance }}m</h4>
              <p>Distancia recorrida</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-clock"></i>
            </div>
            <div class="stat-info">
              <h4>{{ formatTime(currentDayStats.activeTime) }}</h4>
              <p>Tiempo activo</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-tachometer-alt"></i>
            </div>
            <div class="stat-info">
              <h4>{{ currentDayStats.averageSpeed.toFixed(1) }}km/h</h4>
              <p>Velocidad promedio</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-map-marker-alt"></i>
            </div>
            <div class="stat-info">
              <h4>{{ currentDayStats.locationsCount }}</h4>
              <p>Ubicaciones registradas</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Actividad por horas -->
      <div class="activity-chart" *ngIf="hourlyActivity.length > 0">
        <h3>Actividad por horas</h3>
        <div class="chart-container">
          <div class="chart-bars">
            <div class="bar-item" *ngFor="let item of hourlyActivity" [style.height.%]="item.percentage">
              <div class="bar" [class]="item.activity"></div>
              <span class="hour-label">{{ item.hour }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline de ubicaciones -->
      <div class="location-timeline">
        <h3>Historial de ubicaciones</h3>
        
        <div class="timeline-filter">
          <button class="timeline-btn" [class.active]="showDetailed" (click)="toggleDetailedView()">
            <i class="fas fa-list"></i>
            <span>Vista detallada</span>
          </button>
          <button class="timeline-btn" [class.active]="!showDetailed" (click)="toggleDetailedView()">
            <i class="fas fa-map"></i>
            <span>Vista resumida</span>
          </button>
        </div>

        <div class="timeline-items" *ngIf="showDetailed">
          <div class="timeline-item" *ngFor="let location of filteredLocations">
            <div class="timeline-dot" [class]="location.activity || 'default'"></div>
            <div class="timeline-content">
              <div class="location-header">
                <h4>{{ location.address }}</h4>
                <span class="location-time">{{ formatDateTime(location.timestamp) }}</span>
              </div>
              <div class="location-details">
                <div class="detail-item">
                  <i class="fas fa-battery-three-quarters"></i>
                  <span>{{ location.battery }}%</span>
                </div>
                <div class="detail-item">
                  <i class="fas fa-crosshairs"></i>
                  <span>{{ location.accuracy }}m precisión</span>
                </div>
                <div class="detail-item" *ngIf="location.speed">
                  <i class="fas fa-tachometer-alt"></i>
                  <span>{{ location.speed.toFixed(1) }}km/h</span>
                </div>
                <div class="detail-item" *ngIf="location.activity">
                  <i class="fas" [class.fa-walking]="location.activity === 'walking'"
                               [class.fa-running]="location.activity === 'running'"
                               [class.fa-bed]="location.activity === 'resting'"
                               [class.fa-heart]="location.activity === 'playing'"></i>
                  <span>{{ getActivityLabel(location.activity) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="timeline-summary" *ngIf="!showDetailed">
          <div class="summary-item" *ngFor="let summary of locationSummary">
            <div class="summary-icon">
              <i class="fas fa-map-marker-alt"></i>
            </div>
            <div class="summary-content">
              <h4>{{ summary.address }}</h4>
              <p>{{ summary.visitCount }} visitas • {{ formatTime(summary.totalTime) }}</p>
              <span class="summary-time">Última visita: {{ formatDateTime(summary.lastVisit) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Botón para descargar historial -->
      <div class="export-actions">
        <button class="export-btn" (click)="exportHistory()">
          <i class="fas fa-download"></i>
          <span>Descargar historial</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pet-history-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .history-header h2 {
      color: var(--text-primary);
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }

    .date-filters {
      display: flex;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 4px;
    }

    .filter-btn {
      padding: 8px 16px;
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 14px;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .filter-btn.active {
      background: var(--primary-color);
      color: white;
    }

    .filter-btn:hover:not(.active) {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
    }

    .daily-stats {
      margin-bottom: 32px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all var(--transition-fast);
    }

    .stat-card:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-2px);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      background: var(--primary-color);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
    }

    .stat-info h4 {
      color: var(--text-primary);
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    .stat-info p {
      color: var(--text-secondary);
      font-size: 12px;
      margin: 0;
    }

    .activity-chart {
      margin-bottom: 32px;
    }

    .activity-chart h3 {
      color: var(--text-primary);
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }

    .chart-container {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
      height: 200px;
      display: flex;
      align-items: end;
    }

    .chart-bars {
      display: flex;
      align-items: end;
      gap: 8px;
      width: 100%;
      height: 100%;
    }

    .bar-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
    }

    .bar {
      width: 100%;
      background: var(--primary-color);
      border-radius: 4px 4px 0 0;
      min-height: 8px;
      transition: all var(--transition-fast);
    }

    .bar.walking { background: var(--success-color); }
    .bar.running { background: var(--warning-color); }
    .bar.resting { background: var(--text-tertiary); }
    .bar.playing { background: var(--secondary-color); }

    .hour-label {
      color: var(--text-secondary);
      font-size: 10px;
      margin-top: 8px;
    }

    .location-timeline h3 {
      color: var(--text-primary);
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }

    .timeline-filter {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }

    .timeline-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      color: var(--text-secondary);
      font-size: 14px;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .timeline-btn.active {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }

    .timeline-btn:hover:not(.active) {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
    }

    .timeline-items {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
    }

    .timeline-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--primary-color);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .timeline-dot.walking { background: var(--success-color); }
    .timeline-dot.running { background: var(--warning-color); }
    .timeline-dot.resting { background: var(--text-tertiary); }
    .timeline-dot.playing { background: var(--secondary-color); }

    .timeline-content {
      flex: 1;
    }

    .location-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .location-header h4 {
      color: var(--text-primary);
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }

    .location-time {
      color: var(--text-secondary);
      font-size: 12px;
    }

    .location-details {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary);
      font-size: 12px;
    }

    .detail-item i {
      width: 12px;
      text-align: center;
    }

    .timeline-summary {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px;
      transition: all var(--transition-fast);
    }

    .summary-item:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-1px);
    }

    .summary-icon {
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

    .summary-content h4 {
      color: var(--text-primary);
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    .summary-content p {
      color: var(--text-secondary);
      font-size: 14px;
      margin: 0 0 4px 0;
    }

    .summary-time {
      color: var(--text-tertiary);
      font-size: 12px;
    }

    .export-actions {
      margin-top: 32px;
      text-align: center;
    }

    .export-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
      margin: 0 auto;
    }

    .export-btn:hover {
      background: #0056b3;
      transform: translateY(-1px);
    }

    @media (max-width: 768px) {
      .history-header {
        flex-direction: column;
        align-items: stretch;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .stat-card {
        padding: 16px;
      }

      .stat-icon {
        width: 40px;
        height: 40px;
        font-size: 16px;
      }

      .stat-info h4 {
        font-size: 18px;
      }

      .location-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .location-details {
        gap: 12px;
      }

      .timeline-filter {
        flex-direction: column;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class PetHistoryComponent implements OnInit {
  @Input() currentPet: PetData | null = null;
  
  activeFilter: 'today' | 'week' | 'month' = 'today';
  showDetailed = true;
  
  currentDayStats: DailyStats | null = null;
  hourlyActivity: any[] = [];
  filteredLocations: LocationHistory[] = [];
  locationSummary: any[] = [];

  // Datos de ejemplo
  private allLocations: LocationHistory[] = [
    {
      id: '1',
      petId: 1,
      coordinates: [-3.7038, 40.4168],
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      address: 'Parque Central, Madrid',
      battery: 78,
      accuracy: 8,
      speed: 2.5,
      activity: 'walking'
    },
    {
      id: '2',
      petId: 1,
      coordinates: [-3.7073, 40.4155],
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      address: 'Plaza Mayor, Madrid',
      battery: 82,
      accuracy: 5,
      speed: 0,
      activity: 'resting'
    },
    {
      id: '3',
      petId: 1,
      coordinates: [-3.6844, 40.4153],
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      address: 'Retiro, Madrid',
      battery: 85,
      accuracy: 12,
      speed: 8.2,
      activity: 'running'
    }
  ];

  ngOnInit() {
    this.loadHistoryData();
  }

  setFilter(filter: 'today' | 'week' | 'month') {
    this.activeFilter = filter;
    this.loadHistoryData();
  }

  toggleDetailedView() {
    this.showDetailed = !this.showDetailed;
  }

  private loadHistoryData() {
    // Filtrar por mascota actual
    const petLocations = this.allLocations.filter(loc => 
      !this.currentPet || loc.petId === this.currentPet.id
    );

    // Filtrar por fecha
    const now = new Date();
    let startDate: Date;
    
    switch (this.activeFilter) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
    }

    this.filteredLocations = petLocations.filter(loc => loc.timestamp >= startDate);
    
    // Calcular estadísticas
    this.calculateDailyStats();
    this.calculateHourlyActivity();
    this.calculateLocationSummary();
  }

  private calculateDailyStats() {
    if (this.filteredLocations.length === 0) {
      this.currentDayStats = null;
      return;
    }

    const totalDistance = this.calculateTotalDistance();
    const activeTime = this.calculateActiveTime();
    const averageSpeed = this.calculateAverageSpeed();

    this.currentDayStats = {
      date: new Date(),
      totalDistance,
      activeTime,
      restTime: 0,
      averageSpeed,
      locationsCount: this.filteredLocations.length
    };
  }

  private calculateTotalDistance(): number {
    if (this.filteredLocations.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < this.filteredLocations.length; i++) {
      const prev = this.filteredLocations[i - 1];
      const curr = this.filteredLocations[i];
      totalDistance += this.calculateDistance(prev.coordinates, curr.coordinates);
    }
    return Math.round(totalDistance);
  }

  private calculateActiveTime(): number {
    return this.filteredLocations.filter(loc => loc.activity !== 'resting').length * 30; // 30 minutos promedio
  }

  private calculateAverageSpeed(): number {
    const speedReadings = this.filteredLocations.filter(loc => loc.speed && loc.speed > 0);
    if (speedReadings.length === 0) return 0;
    
    const totalSpeed = speedReadings.reduce((sum, loc) => sum + (loc.speed || 0), 0);
    return totalSpeed / speedReadings.length;
  }

  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const R = 6371000; // Radio de la Tierra en metros
    const lat1 = coord1[1] * Math.PI / 180;
    const lat2 = coord2[1] * Math.PI / 180;
    const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const deltaLng = (coord2[0] - coord1[0]) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private calculateHourlyActivity() {
    const hours = Array.from({length: 24}, (_, i) => i);
    const maxActivity = Math.max(...hours) || 1;
    
    this.hourlyActivity = hours.map(hour => ({
      hour: hour < 10 ? `0${hour}` : `${hour}`,
      activity: hour >= 8 && hour <= 18 ? 'walking' : 'resting',
      percentage: Math.random() * 100 // Datos simulados
    }));
  }

  private calculateLocationSummary() {
    const locationGroups = this.filteredLocations.reduce((acc, loc) => {
      const key = loc.address;
      if (!acc[key]) {
        acc[key] = {
          address: key,
          visitCount: 0,
          totalTime: 0,
          lastVisit: loc.timestamp
        };
      }
      acc[key].visitCount++;
      acc[key].totalTime += 30; // 30 minutos promedio por visita
      if (loc.timestamp > acc[key].lastVisit) {
        acc[key].lastVisit = loc.timestamp;
      }
      return acc;
    }, {} as any);

    this.locationSummary = Object.values(locationGroups);
  }

  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  formatDateTime(date: Date): string {
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getActivityLabel(activity: string): string {
    const labels = {
      walking: 'Caminando',
      running: 'Corriendo',
      resting: 'Descansando',
      playing: 'Jugando'
    };
    return labels[activity as keyof typeof labels] || activity;
  }

  exportHistory() {
    const data = {
      pet: this.currentPet?.name || 'Mascota',
      filter: this.activeFilter,
      stats: this.currentDayStats,
      locations: this.filteredLocations
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `historial_${this.currentPet?.name || 'mascota'}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }
}
