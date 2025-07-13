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

  // Historial de rutas REALISTAS siguiendo calles de Lima (no líneas rectas)
  private allLocations: LocationHistory[] = [
    // MAX - Ruta desde Calle Cantuarias siguiendo calles reales hasta Parque Kennedy (ID: 1)
    {
      id: 'max_1',
      petId: 1,
      coordinates: [-77.0317, -12.1165], // Inicio: Calle Cantuarias con Pasaje Tello, Miraflores
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
      address: 'Calle Cantuarias con Pasaje Tello, Miraflores',
      battery: 100,
      accuracy: 5,
      speed: 0,
      activity: 'resting'
    },
    {
      id: 'max_2',
      petId: 1,
      coordinates: [-77.0315, -12.1162], // Por Calle Cantuarias hacia el norte
      timestamp: new Date(Date.now() - 7.5 * 60 * 60 * 1000),
      address: 'Calle Cantuarias hacia el norte, Miraflores',
      battery: 98,
      accuracy: 6,
      speed: 2.1,
      activity: 'walking'
    },
    {
      id: 'max_3',
      petId: 1,
      coordinates: [-77.0312, -12.1158], // Continuando por Cantuarias
      timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000),
      address: 'Calle Cantuarias cuadra 2, Miraflores',
      battery: 96,
      accuracy: 4,
      speed: 2.3,
      activity: 'walking'
    },
    {
      id: 'max_4',
      petId: 1,
      coordinates: [-77.0308, -12.1155], // Girando hacia Av. Benavides
      timestamp: new Date(Date.now() - 6.5 * 60 * 60 * 1000),
      address: 'Calle Cantuarias con Av. Benavides, Miraflores',
      battery: 94,
      accuracy: 5,
      speed: 1.8,
      activity: 'walking'
    },
    {
      id: 'max_5',
      petId: 1,
      coordinates: [-77.0305, -12.1152], // Por Av. Benavides hacia el este
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      address: 'Av. Benavides cuadra 45, Miraflores',
      battery: 92,
      accuracy: 6,
      speed: 2.0,
      activity: 'walking'
    },
    {
      id: 'max_6',
      petId: 1,
      coordinates: [-77.0302, -12.1148], // Continuando por Benavides
      timestamp: new Date(Date.now() - 5.5 * 60 * 60 * 1000),
      address: 'Av. Benavides cuadra 44, Miraflores',
      battery: 90,
      accuracy: 4,
      speed: 1.5,
      activity: 'walking'
    },
    {
      id: 'max_7',
      petId: 1,
      coordinates: [-77.0298, -12.1145], // Girando en Av. Arequipa
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      address: 'Av. Benavides con Av. Arequipa, Miraflores',
      battery: 88,
      accuracy: 8,
      speed: 0,
      activity: 'resting'
    },
    {
      id: 'max_8',
      petId: 1,
      coordinates: [-77.0295, -12.1142], // Por Av. Arequipa hacia el norte
      timestamp: new Date(Date.now() - 4.5 * 60 * 60 * 1000),
      address: 'Av. Arequipa cuadra 41, Miraflores',
      battery: 85,
      accuracy: 7,
      speed: 4.2,
      activity: 'running'
    },
    {
      id: 'max_9',
      petId: 1,
      coordinates: [-77.0292, -12.1138], // Continuando por Arequipa
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      address: 'Av. Arequipa cuadra 40, Miraflores',
      battery: 82,
      accuracy: 5,
      speed: 3.8,
      activity: 'running'
    },
    {
      id: 'max_10',
      petId: 1,
      coordinates: [-77.0288, -12.1135], // Girando hacia Av. José Pardo
      timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
      address: 'Av. Arequipa con José Pardo, Miraflores',
      battery: 80,
      accuracy: 6,
      speed: 2.8,
      activity: 'walking'
    },
    {
      id: 'max_11',
      petId: 1,
      coordinates: [-77.0285, -12.1232], // Por José Pardo hacia el oeste
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      address: 'Av. José Pardo cuadra 4, Miraflores',
      battery: 78,
      accuracy: 7,
      speed: 1.2,
      activity: 'walking'
    },
    {
      id: 'max_12',
      petId: 1,
      coordinates: [-77.0282, -12.1228], // Llegando a Parque Kennedy
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      address: 'José Pardo con Av. Larco, cerca Parque Kennedy',
      battery: 76,
      accuracy: 5,
      speed: 2.5,
      activity: 'walking'
    },
    {
      id: 'max_13',
      petId: 1,
      coordinates: [-77.0280, -12.1225], // En Parque Kennedy
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      address: 'Parque Kennedy, Av. Larco, Miraflores',
      battery: 74,
      accuracy: 3,
      speed: 0,
      activity: 'resting'
    },

    // LUNA - Recorrido por Santa Isabel siguiendo las calles y parques (ID: 2)
    {
      id: 'luna_1',
      petId: 2,
      coordinates: [-76.9568, -12.0631], // Inicio: Casa en Santa Isabel
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      address: 'Casa en Santa Isabel, Lima',
      battery: 85,
      accuracy: 3,
      speed: 0,
      activity: 'resting'
    },
    {
      id: 'luna_2',
      petId: 2,
      coordinates: [-76.9567, -12.0630], // Saliendo de casa por la calle
      timestamp: new Date(Date.now() - 5.8 * 60 * 60 * 1000),
      address: 'Calle residencial, Santa Isabel',
      battery: 84,
      accuracy: 4,
      speed: 1.2,
      activity: 'walking'
    },
    {
      id: 'luna_3',
      petId: 2,
      coordinates: [-76.9566, -12.0628], // Hacia Av. Los Incas
      timestamp: new Date(Date.now() - 5.5 * 60 * 60 * 1000),
      address: 'Cerca de Av. Los Incas, Santa Isabel',
      battery: 82,
      accuracy: 5,
      speed: 1.8,
      activity: 'walking'
    },
    {
      id: 'luna_4',
      petId: 2,
      coordinates: [-76.9565, -12.0627], // Por Av. Los Incas hacia el norte
      timestamp: new Date(Date.now() - 5.2 * 60 * 60 * 1000),
      address: 'Av. Los Incas, Santa Isabel',
      battery: 80,
      accuracy: 4,
      speed: 2.1,
      activity: 'walking'
    },
    {
      id: 'luna_5',
      petId: 2,
      coordinates: [-76.9564, -12.0625], // Continuando por Los Incas
      timestamp: new Date(Date.now() - 4.8 * 60 * 60 * 1000),
      address: 'Av. Los Incas Norte, Santa Isabel',
      battery: 78,
      accuracy: 6,
      speed: 1.5,
      activity: 'walking'
    },
    {
      id: 'luna_6',
      petId: 2,
      coordinates: [-76.9563, -12.0624], // Girando hacia un parque local
      timestamp: new Date(Date.now() - 4.5 * 60 * 60 * 1000),
      address: 'Entrada al Parque Local, Santa Isabel',
      battery: 76,
      accuracy: 3,
      speed: 0.8,
      activity: 'walking'
    },
    {
      id: 'luna_7',
      petId: 2,
      coordinates: [-76.9562, -12.0622], // Explorando área verde
      timestamp: new Date(Date.now() - 4.2 * 60 * 60 * 1000),
      address: 'Área Verde del Parque, Santa Isabel',
      battery: 74,
      accuracy: 4,
      speed: 0.5,
      activity: 'playing'
    },
    {
      id: 'luna_8',
      petId: 2,
      coordinates: [-76.9561, -12.0621], // En el parque jugando
      timestamp: new Date(Date.now() - 3.8 * 60 * 60 * 1000),
      address: 'Centro del Parque, Santa Isabel',
      battery: 72,
      accuracy: 5,
      speed: 0,
      activity: 'playing'
    },
    {
      id: 'luna_9',
      petId: 2,
      coordinates: [-76.9562, -12.0622], // Regresando por área verde
      timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
      address: 'Salida del Parque, Santa Isabel',
      battery: 70,
      accuracy: 4,
      speed: 1.3,
      activity: 'walking'
    },
    {
      id: 'luna_10',
      petId: 2,
      coordinates: [-76.9564, -12.0623], // De vuelta por Los Incas
      timestamp: new Date(Date.now() - 3.2 * 60 * 60 * 1000),
      address: 'Av. Los Incas de regreso, Santa Isabel',
      battery: 68,
      accuracy: 5,
      speed: 2.0,
      activity: 'running'
    },
    {
      id: 'luna_11',
      petId: 2,
      coordinates: [-76.9565, -12.0625], // Por la avenida principal
      timestamp: new Date(Date.now() - 2.8 * 60 * 60 * 1000),
      address: 'Av. Los Incas Sur, Santa Isabel',
      battery: 66,
      accuracy: 4,
      speed: 2.3,
      activity: 'running'
    },
    {
      id: 'luna_12',
      petId: 2,
      coordinates: [-76.9567, -12.0627], // Girando hacia casa
      timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
      address: 'Intersección hacia casa, Santa Isabel',
      battery: 65,
      accuracy: 5,
      speed: 1.5,
      activity: 'walking'
    },
    {
      id: 'luna_13',
      petId: 2,
      coordinates: [-76.9568, -12.0629], // Calle residencial de regreso
      timestamp: new Date(Date.now() - 2.2 * 60 * 60 * 1000),
      address: 'Calle residencial de regreso, Santa Isabel',
      battery: 64,
      accuracy: 3,
      speed: 1.0,
      activity: 'walking'
    },
    {
      id: 'luna_14',
      petId: 2,
      coordinates: [-76.9568, -12.0631], // De vuelta a casa
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      address: 'Casa en Santa Isabel, Lima',
      battery: 63,
      accuracy: 3,
      speed: 0,
      activity: 'resting'
    },

    // CHARLIE - Ruta turística por Barranco desde Plaza Municipal al Puente de los Suspiros (ID: 3)
    {
      id: 'charlie_1',
      petId: 3,
      coordinates: [-77.0185, -12.1425], // Inicio: Plaza Municipal de Barranco
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      address: 'Plaza Municipal de Barranco',
      battery: 30,
      accuracy: 8,
      speed: 0,
      activity: 'resting'
    },
    {
      id: 'charlie_2',
      petId: 3,
      coordinates: [-77.0183, -12.1428], // Saliendo por Jr. Lima
      timestamp: new Date(Date.now() - 3.8 * 60 * 60 * 1000),
      address: 'Jr. Lima desde la Plaza Municipal, Barranco',
      battery: 28,
      accuracy: 9,
      speed: 1.5,
      activity: 'walking'
    },
    {
      id: 'charlie_3',
      petId: 3,
      coordinates: [-77.0180, -12.1432], // Por Jr. Lima hacia el norte
      timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
      address: 'Jr. Lima cuadra 1, Barranco',
      battery: 26,
      accuracy: 10,
      speed: 1.8,
      activity: 'walking'
    },
    {
      id: 'charlie_4',
      petId: 3,
      coordinates: [-77.0178, -12.1435], // Continuando por Jr. Lima
      timestamp: new Date(Date.now() - 3.2 * 60 * 60 * 1000),
      address: 'Jr. Lima cuadra 2, Barranco',
      battery: 24,
      accuracy: 12,
      speed: 2.1,
      activity: 'walking'
    },
    {
      id: 'charlie_5',
      petId: 3,
      coordinates: [-77.0173, -12.1442], // Girando hacia Jr. Ayacucho
      timestamp: new Date(Date.now() - 2.8 * 60 * 60 * 1000),
      address: 'Jr. Lima con Jr. Ayacucho, Barranco',
      battery: 22,
      accuracy: 15,
      speed: 1.2,
      activity: 'walking'
    },
    {
      id: 'charlie_6',
      petId: 3,
      coordinates: [-77.0171, -12.1445], // Por Jr. Ayacucho hacia el malecón
      timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
      address: 'Jr. Ayacucho hacia área histórica, Barranco',
      battery: 20,
      accuracy: 11,
      speed: 2.0,
      activity: 'walking'
    },
    {
      id: 'charlie_7',
      petId: 3,
      coordinates: [-77.0167, -12.1452], // Área histórica de Barranco
      timestamp: new Date(Date.now() - 2.2 * 60 * 60 * 1000),
      address: 'Jr. Ayacucho área histórica, Barranco',
      battery: 18,
      accuracy: 8,
      speed: 1.8,
      activity: 'walking'
    },
    {
      id: 'charlie_8',
      petId: 3,
      coordinates: [-77.0165, -12.1455], // Girando hacia Jr. Batallón Callao
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      address: 'Jr. Ayacucho con Jr. Batallón Callao, Barranco',
      battery: 17,
      accuracy: 9,
      speed: 1.5,
      activity: 'walking'
    },
    {
      id: 'charlie_9',
      petId: 3,
      coordinates: [-77.0164, -12.1458], // Por Jr. Batallón Callao
      timestamp: new Date(Date.now() - 1.8 * 60 * 60 * 1000),
      address: 'Jr. Batallón Callao, Barranco',
      battery: 16,
      accuracy: 7,
      speed: 1.3,
      activity: 'walking'
    },
    {
      id: 'charlie_10',
      petId: 3,
      coordinates: [-77.0163, -12.1461], // Acercándose al Puente de los Suspiros
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      address: 'Cerca del Puente de los Suspiros, Barranco',
      battery: 15,
      accuracy: 6,
      speed: 0.8,
      activity: 'walking'
    },
    {
      id: 'charlie_11',
      petId: 3,
      coordinates: [-77.0162, -12.1464], // Llegando al Puente de los Suspiros
      timestamp: new Date(Date.now() - 1.2 * 60 * 60 * 1000),
      address: 'Puente de los Suspiros, Barranco',
      battery: 14,
      accuracy: 5,
      speed: 0,
      activity: 'resting'
    },
    {
      id: 'charlie_12',
      petId: 3,
      coordinates: [-77.0161, -12.1467], // Explorando el área del puente
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      address: 'Área turística del Puente, Barranco',
      battery: 13,
      accuracy: 4,
      speed: 0.5,
      activity: 'playing'
    },
    {
      id: 'charlie_13',
      petId: 3,
      coordinates: [-77.0180, -12.1441], // Regresando por Jr. Lima
      timestamp: new Date(Date.now() - 0.5 * 60 * 60 * 1000),
      address: 'Jr. Lima de regreso, Barranco',
      battery: 12,
      accuracy: 8,
      speed: 2.5,
      activity: 'running'
    },
    {
      id: 'charlie_14',
      petId: 3,
      coordinates: [-77.0185, -12.1425], // De vuelta a Plaza Municipal
      timestamp: new Date(Date.now() - 0.2 * 60 * 60 * 1000),
      address: 'Plaza Municipal de Barranco',
      battery: 11,
      accuracy: 6,
      speed: 0,
      activity: 'resting'
    },

    // BELLA - Ruta elegante por Surco desde Av. Primavera al Parque de la Amistad (ID: 4)
    {
      id: 'bella_1',
      petId: 4,
      coordinates: [-76.9925, -12.1280], // Inicio: Casa en Av. Primavera, Surco
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      address: 'Casa en Av. Primavera, Santiago de Surco',
      battery: 100,
      accuracy: 4,
      speed: 0,
      activity: 'resting'
    },
    {
      id: 'bella_2',
      petId: 4,
      coordinates: [-76.9923, -12.1278], // Saliendo por Av. Primavera hacia el norte
      timestamp: new Date(Date.now() - 4.8 * 60 * 60 * 1000),
      address: 'Av. Primavera hacia el norte, Surco',
      battery: 98,
      accuracy: 5,
      speed: 2.2,
      activity: 'walking'
    },
    {
      id: 'bella_3',
      petId: 4,
      coordinates: [-76.9920, -12.1275], // Av. Primavera cuadra 12
      timestamp: new Date(Date.now() - 4.5 * 60 * 60 * 1000),
      address: 'Av. Primavera cuadra 12, Surco',
      battery: 96,
      accuracy: 6,
      speed: 1.8,
      activity: 'walking'
    },
    {
      id: 'bella_4',
      petId: 4,
      coordinates: [-76.9918, -12.1273], // Av. Primavera cuadra 13
      timestamp: new Date(Date.now() - 4.2 * 60 * 60 * 1000),
      address: 'Av. Primavera cuadra 13, Surco',
      battery: 94,
      accuracy: 5,
      speed: 2.0,
      activity: 'walking'
    },
    {
      id: 'bella_5',
      petId: 4,
      coordinates: [-76.9915, -12.1270], // Girando hacia Av. El Derby
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      address: 'Av. Primavera con Av. El Derby, Surco',
      battery: 92,
      accuracy: 7,
      speed: 1.5,
      activity: 'walking'
    },
    {
      id: 'bella_6',
      petId: 4,
      coordinates: [-76.9912, -12.1268], // Av. El Derby cuadra 1
      timestamp: new Date(Date.now() - 3.7 * 60 * 60 * 1000),
      address: 'Av. El Derby cuadra 1, Surco',
      battery: 90,
      accuracy: 6,
      speed: 2.1,
      activity: 'walking'
    },
    {
      id: 'bella_7',
      petId: 4,
      coordinates: [-76.9910, -12.1265], // Av. El Derby cuadra 2
      timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
      address: 'Av. El Derby cuadra 2, Surco',
      battery: 88,
      accuracy: 5,
      speed: 1.9,
      activity: 'walking'
    },
    {
      id: 'bella_8',
      petId: 4,
      coordinates: [-76.9908, -12.1263], // El Derby hacia Av. Velasco Astete
      timestamp: new Date(Date.now() - 3.2 * 60 * 60 * 1000),
      address: 'El Derby con Av. Velasco Astete, Surco',
      battery: 86,
      accuracy: 4,
      speed: 1.7,
      activity: 'walking'
    },
    {
      id: 'bella_9',
      petId: 4,
      coordinates: [-76.9905, -12.1260], // Av. Velasco Astete
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      address: 'Av. Velasco Astete, Surco',
      battery: 84,
      accuracy: 6,
      speed: 2.3,
      activity: 'walking'
    },
    {
      id: 'bella_10',
      petId: 4,
      coordinates: [-76.9903, -12.1258], // Velasco Astete hacia el parque
      timestamp: new Date(Date.now() - 2.8 * 60 * 60 * 1000),
      address: 'Av. Velasco Astete hacia el parque, Surco',
      battery: 82,
      accuracy: 5,
      speed: 2.0,
      activity: 'walking'
    },
    {
      id: 'bella_11',
      petId: 4,
      coordinates: [-76.9900, -12.1255], // Acercándose al Parque de la Amistad
      timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
      address: 'Cerca del Parque de la Amistad, Surco',
      battery: 80,
      accuracy: 4,
      speed: 1.5,
      activity: 'walking'
    },
    {
      id: 'bella_12',
      petId: 4,
      coordinates: [-76.9898, -12.1253], // Entrada del Parque de la Amistad
      timestamp: new Date(Date.now() - 2.2 * 60 * 60 * 1000),
      address: 'Entrada del Parque de la Amistad, Surco',
      battery: 78,
      accuracy: 3,
      speed: 1.0,
      activity: 'walking'
    },
    {
      id: 'bella_13',
      petId: 4,
      coordinates: [-76.9895, -12.1250], // Centro del parque - área de juegos
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      address: 'Centro del Parque de la Amistad, Surco',
      battery: 76,
      accuracy: 4,
      speed: 0,
      activity: 'playing'
    },
    {
      id: 'bella_14',
      petId: 4,
      coordinates: [-76.9893, -12.1248], // Área verde norte del parque
      timestamp: new Date(Date.now() - 1.8 * 60 * 60 * 1000),
      address: 'Área verde del Parque de la Amistad, Surco',
      battery: 74,
      accuracy: 5,
      speed: 0.8,
      activity: 'playing'
    },
    {
      id: 'bella_15',
      petId: 4,
      coordinates: [-76.9900, -12.1256], // De vuelta a Av. Velasco Astete
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      address: 'Saliendo hacia Av. Velasco Astete, Surco',
      battery: 72,
      accuracy: 4,
      speed: 2.5,
      activity: 'running'
    },
    {
      id: 'bella_16',
      petId: 4,
      coordinates: [-76.9912, -12.1269], // Girando a Av. Primavera
      timestamp: new Date(Date.now() - 1.2 * 60 * 60 * 1000),
      address: 'El Derby con Av. Primavera, Surco',
      battery: 70,
      accuracy: 5,
      speed: 2.2,
      activity: 'running'
    },
    {
      id: 'bella_17',
      petId: 4,
      coordinates: [-76.9920, -12.1276], // Av. Primavera hacia casa
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      address: 'Av. Primavera de regreso, Surco',
      battery: 68,
      accuracy: 4,
      speed: 1.8,
      activity: 'walking'
    },
    {
      id: 'bella_18',
      petId: 4,
      coordinates: [-76.9925, -12.1280], // De vuelta a casa en Av. Primavera
      timestamp: new Date(Date.now() - 0.7 * 60 * 60 * 1000),
      address: 'Casa en Av. Primavera, Santiago de Surco',
      battery: 66,
      accuracy: 3,
      speed: 0,
      activity: 'resting'
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
