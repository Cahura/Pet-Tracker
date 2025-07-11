import { Component, ViewChild, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { MapSimpleComponent } from '../map/map-simple';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PetSelectionService, PetData } from '../services/pet-selection.service';
import { AuthService } from '../services/auth.service';
import { SafeZonesComponent } from '../components/safe-zones.component';
import { PetHistoryComponent } from '../components/pet-history.component';
import { PetPhotosComponent } from '../components/pet-photos.component';
import { PetAlertsComponent } from '../components/pet-alerts.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-map-view',
  template: `
    <div class="pet-tracker-app">
      <!-- Header with liquid glass effect -->
      <header class="app-header liquid-glass-strong animate-fade-in">
        <div class="header-content">
          <div class="logo-section">
            <div class="logo-icon">
              <i class="fas fa-paw"></i>
            </div>
            <h1 class="app-title">PetTracker</h1>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary location-btn" (click)="onLocationClick()">
              <i class="fas fa-location-dot"></i>
              <span>Mi Ubicación</span>
            </button>
            <button class="btn btn-primary settings-btn" (click)="toggleSettings()">
              <i class="fas fa-gear"></i>
            </button>
          </div>
        </div>
      </header>

      <!-- Main content area -->
      <main class="app-main">
        <!-- Map container -->
        <div class="map-container">
          <app-map-simple #mapComponent></app-map-simple>
          
          <!-- Status island - moved to map area -->
          <div class="status-island liquid-glass animate-fade-in">
            <div class="status-content">
              <div class="status-indicator">
                <div class="indicator-dot animate-pulse"></div>
                <span>En vivo</span>
              </div>
              <div class="last-update">
                Hace 1 min
              </div>
            </div>
          </div>
          
          <!-- Floating controls -->
          <div class="map-controls">
            <!-- Zoom controls -->
            <div class="control-group">
              <button class="control-btn" title="Zoom In" (click)="onZoomIn()">
                <i class="fas fa-plus"></i>
              </button>
              <button class="control-btn" title="Zoom Out" (click)="onZoomOut()">
                <i class="fas fa-minus"></i>
              </button>
            </div>
            
            <!-- Navigation controls - Find My style -->
            <div class="find-my-center-btn" title="Centrar en la mascota" (click)="onCenterOnPet()">
              <i class="fas fa-location-dot"></i>
            </div>
          </div>
        </div>
        
        <!-- Bottom sheet estilo isla Apple/Find My -->
        <div class="pet-bottom-sheet liquid-glass-strong" [class.expanded]="isSheetExpanded" (click)="toggleSheet()">
          <div class="sheet-handle"></div>
          
          <!-- Contenido minimizado - solo iconos -->
          <div class="sheet-minimized" [class.hidden]="isSheetExpanded">
            <div class="mini-actions">
              <button class="mini-action-btn" (click)="onQuickAction('history'); $event.stopPropagation()">
                <i class="fas fa-route"></i>
              </button>
              <button class="mini-action-btn" (click)="onQuickAction('alerts'); $event.stopPropagation()">
                <i class="fas fa-bell"></i>
              </button>
              <button class="mini-action-btn" (click)="onQuickAction('safezones'); $event.stopPropagation()">
                <i class="fas fa-shield-alt"></i>
              </button>
              <button class="mini-action-btn" (click)="onQuickAction('camera'); $event.stopPropagation()">
                <i class="fas fa-camera"></i>
              </button>
            </div>
          </div>
          
          <!-- Contenido expandido -->
          <div class="sheet-expanded" [class.hidden]="!isSheetExpanded">
            <div class="pet-info-card">
              <div class="pet-avatar" [style.background]="currentAnimal.gradient">
                <div class="pet-status" [class]="currentAnimal.status"></div>
                <i [class]="currentAnimal.icon" style="color: white; font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>
              </div>
              <div class="pet-details">
                <h3 class="pet-name">{{ currentAnimal.name }}</h3>
                <p class="pet-breed">{{ currentAnimal.breed }}</p>
                <div class="pet-stats">
                  <div class="stat">
                    <i class="fas fa-signal"></i>
                    <span>{{ currentAnimal.status === 'online' ? 'Conectado' : 'Desconectado' }}</span>
                  </div>
                  <div class="stat">
                    <i class="fas fa-battery-three-quarters"></i>
                    <span>{{ currentAnimal.battery }}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="location-info">
              <h4>Última ubicación</h4>
              <p class="location-address">{{ currentAnimal.location }}</p>
              <p class="location-time">Hace 2 minutos</p>
            </div>          <div class="quick-actions">
            <button class="action-btn" (click)="onQuickAction('history'); $event.stopPropagation()">
              <i class="fas fa-route"></i>
              <span>Historial</span>
            </button>
            <button class="action-btn" (click)="onQuickAction('alerts'); $event.stopPropagation()">
              <i class="fas fa-bell"></i>
              <span>Alertas</span>
            </button>
            <button class="action-btn" (click)="onQuickAction('safezones'); $event.stopPropagation()">
              <i class="fas fa-shield-alt"></i>
              <span>Zonas</span>
            </button>
            <button class="action-btn" (click)="onQuickAction('camera'); $event.stopPropagation()">
              <i class="fas fa-camera"></i>
              <span>Fotos</span>
            </button>
          </div>
          </div>
        </div>

        <!-- Settings Modal -->
        <div class="settings-modal" [class.show]="showSettingsModal" (click)="showSettingsModal = false">
          <div class="settings-content liquid-glass-strong" (click)="$event.stopPropagation()">
            <div class="settings-header">
              <h2>Configuraciones</h2>
              <button class="close-btn" (click)="showSettingsModal = false">
                <i class="fas fa-times"></i>
              </button>
            </div>
            
            <div class="settings-section">
              <h3>Cambiar Mascota</h3>
              <div class="animals-grid">
                <div class="animal-card" 
                     *ngFor="let animal of demoAnimals" 
                     [class.active]="animal.id === currentAnimal.id"
                     (click)="selectAnimal(animal)">
                  <div class="animal-avatar" [style.background]="animal.gradient">
                    <div class="animal-status" [class]="animal.status"></div>
                    <i [class]="animal.icon" style="color: white; font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>
                  </div>
                  <div class="animal-info">
                    <h4>{{ animal.name }}</h4>
                    <p>{{ animal.breed }}</p>
                    <span class="battery">{{ animal.battery }}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="settings-section">
              <h3>Opciones</h3>
              <div class="settings-options">
                <button class="settings-option-btn" (click)="openNotifications()">
                  <i class="fas fa-bell"></i>
                  <span>Notificaciones</span>
                </button>
                <button class="settings-option-btn" (click)="openSafeZones()">
                  <i class="fas fa-map"></i>
                  <span>Zonas Seguras</span>
                </button>
                <button class="settings-option-btn" (click)="openHistory()">
                  <i class="fas fa-history"></i>
                  <span>Historial Completo</span>
                </button>
                <button class="settings-option-btn logout-btn" (click)="logout()">
                  <i class="fas fa-sign-out-alt"></i>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Modal para Zonas Seguras -->
    <div class="feature-modal" [class.show]="showSafeZonesModal" (click)="closeSafeZonesModal()">
      <div class="feature-modal-content" (click)="$event.stopPropagation()">
        <div class="feature-modal-header">
          <h2>Zonas Seguras</h2>
          <button class="close-btn" (click)="closeSafeZonesModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="feature-modal-body">
          <app-safe-zones [currentPet]="currentAnimal" (toggleSafeZoneMap)="toggleSafeZoneOnMap()"></app-safe-zones>
        </div>
      </div>
    </div>

    <!-- Modal para Historial -->
    <div class="feature-modal" [class.show]="showHistoryModal" (click)="closeHistoryModal()">
      <div class="feature-modal-content" (click)="$event.stopPropagation()">
        <div class="feature-modal-header">
          <h2>Historial Completo</h2>
          <button class="close-btn" (click)="closeHistoryModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="feature-modal-body">
          <app-pet-history [currentPet]="currentAnimal"></app-pet-history>
        </div>
      </div>
    </div>

    <!-- Modal para Fotos -->
    <div class="feature-modal" [class.show]="showPhotosModal" (click)="closePhotosModal()">
      <div class="feature-modal-content" (click)="$event.stopPropagation()">
        <div class="feature-modal-header">
          <h2>Fotos de {{ currentAnimal.name }}</h2>
          <button class="close-btn" (click)="closePhotosModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="feature-modal-body">
          <app-pet-photos [currentPet]="currentAnimal"></app-pet-photos>
        </div>
      </div>
    </div>

    <!-- Modal para Alertas -->
    <div class="feature-modal" [class.show]="showAlertsModal" (click)="closeAlertsModal()">
      <div class="feature-modal-content" (click)="$event.stopPropagation()">
        <div class="feature-modal-header">
          <h2>Alertas de {{ currentAnimal.name }}</h2>
          <button class="close-btn" (click)="closeAlertsModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="feature-modal-body">
          <app-pet-alerts [currentPet]="currentAnimal"></app-pet-alerts>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmación de Logout -->
    <div class="logout-confirm-modal" [class.show]="showLogoutConfirm" (click)="cancelLogout()">
      <div class="logout-confirm-content liquid-glass-strong" (click)="$event.stopPropagation()">
        <div class="logout-confirm_header">
          <div class="logout-icon">
            <i class="fas fa-sign-out-alt"></i>
          </div>
          <h3>Cerrar Sesión</h3>
          <p>¿Estás seguro de que quieres cerrar sesión?</p>
        </div>
        
        <div class="logout-confirm-actions">
          <button class="logout-btn-cancel" (click)="cancelLogout()">
            <i class="fas fa-times"></i>
            <span>Cancelar</span>
          </button>
          <button class="logout-btn-confirm" (click)="confirmLogout()">
            <i class="fas fa-check"></i>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../app.scss'],
  standalone: true,
  imports: [CommonModule, MapSimpleComponent, SafeZonesComponent, PetHistoryComponent, PetPhotosComponent, PetAlertsComponent]
})
export class MapViewComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('mapComponent') mapComponent!: MapSimpleComponent;
  
  isSheetExpanded = false;
  showSettingsModal = false;
  showSafeZonesModal = false;
  showHistoryModal = false;
  showPhotosModal = false;
  showAlertsModal = false;
  showLogoutConfirm = false; // Modal de confirmación de logout
  showSafeZoneOnMap = false;
  private petSelectionSubscription?: Subscription;

  // Lista de mascotas demo - ahora viene del servicio
  demoAnimals: PetData[] = [];
  currentAnimal: PetData;

  constructor(
    private petSelectionService: PetSelectionService,
    private router: Router,
    private authService: AuthService
  ) {
    // Inicializar con la mascota seleccionada o la por defecto
    this.demoAnimals = this.petSelectionService.getDemoAnimals();
    
    // Obtener la mascota actualmente seleccionada o usar la por defecto
    const selectedPet = this.petSelectionService.getCurrentPet();
    this.currentAnimal = selectedPet || this.petSelectionService.getDefaultPet();
    
    console.log('MapView initialized with animal:', this.currentAnimal.name);
  }

  ngOnInit() {
    // Suscribirse a los cambios de selección de mascota
    this.petSelectionSubscription = this.petSelectionService.selectedPet$.subscribe(selectedPet => {
      if (selectedPet) {
        console.log('Pet changed to:', selectedPet);
        this.currentAnimal = selectedPet;
        
        // Actualizar el mapa si está disponible
        if (this.mapComponent) {
          this.mapComponent.updatePetMarker(selectedPet);
          this.mapComponent.updateLocation(selectedPet.coordinates);
        }
      }
    });
  }

  ngOnDestroy() {
    // Limpiar suscripción
    if (this.petSelectionSubscription) {
      this.petSelectionSubscription.unsubscribe();
    }
  }

  ngAfterViewInit() {
    // Inicializar el mapa con la mascota actual cuando esté listo
    setTimeout(() => {
      if (this.mapComponent) {
        console.log('Initializing map with current animal:', this.currentAnimal.name);
        this.mapComponent.initializeWithAnimal(this.currentAnimal);
      }
    }, 100);
  }

  onLocationClick() {
    console.log('Location clicked');
  }

  onZoomIn() {
    console.log('Zoom in');
    if (this.mapComponent) {
      this.mapComponent.zoomIn();
    }
  }

  onZoomOut() {
    console.log('Zoom out');
    if (this.mapComponent) {
      this.mapComponent.zoomOut();
    }
  }

  onCenterOnPet() {
    console.log('Center on pet');
    if (this.mapComponent) {
      this.mapComponent.centerOnPet();
    }
  }

  toggleSheet() {
    this.isSheetExpanded = !this.isSheetExpanded;
  }

  onQuickAction(action: string) {
    console.log('Quick action:', action);
    
    switch (action) {
      case 'history':
        this.showHistoryOnMap();
        break;
      case 'alerts':
        this.showAlertsModal = true;
        break;
      case 'safezones':
        this.showSafeZonesModal = true;
        break;
      case 'camera':
        this.showPhotosModal = true;
        break;
    }
  }

  toggleSettings() {
    this.showSettingsModal = !this.showSettingsModal;
  }

  selectAnimal(animal: PetData) {
    // Pequeño delay para mostrar la transición
    this.showSettingsModal = false;
    
    setTimeout(() => {
      console.log('Selecting animal:', animal);
      this.petSelectionService.selectPetById(animal.id);
    }, 200);
  }

  openNotifications() {
    this.showSettingsModal = false;
    console.log('Opening notifications...');
    // Aquí implementarías la lógica para notificaciones
  }

  openSafeZones() {
    this.showSettingsModal = false;
    this.showSafeZonesModal = true;
  }

  openHistory() {
    this.showSettingsModal = false;
    this.showHistoryModal = true;
  }

  closeSafeZonesModal() {
    this.showSafeZonesModal = false;
  }

  closeHistoryModal() {
    this.showHistoryModal = false;
  }

  closePhotosModal() {
    this.showPhotosModal = false;
  }

  closeAlertsModal() {
    this.showAlertsModal = false;
  }

  showHistoryOnMap() {
    // Mostrar la ruta de la mascota en el mapa
    console.log('Showing history on map for:', this.currentAnimal.name);
    if (this.mapComponent) {
      this.mapComponent.showPetHistory(this.currentAnimal);
    }
  }

  toggleSafeZoneOnMap() {
    this.showSafeZoneOnMap = !this.showSafeZoneOnMap;
    console.log('Toggle safe zone on map:', this.showSafeZoneOnMap);
    
    if (this.mapComponent) {
      if (this.showSafeZoneOnMap) {
        this.mapComponent.showSafeZone(this.currentAnimal);
      } else {
        this.mapComponent.hideSafeZone();
      }
    }
  }

  async logout() {
    console.log('Logout button clicked!'); // Debug log
    
    // Mostrar modal de confirmación personalizado en lugar del popup nativo
    this.showLogoutConfirm = true;
    // Cerrar el modal de configuraciones
    this.showSettingsModal = false;
  }

  cancelLogout() {
    console.log('User cancelled logout'); // Debug log
    this.showLogoutConfirm = false;
  }

  async confirmLogout() {
    console.log('User confirmed logout'); // Debug log
    
    // Cerrar el modal de confirmación
    this.showLogoutConfirm = false;
    
    try {
      // Usar el servicio de autenticación para logout
      await this.authService.logout();
      console.log('Successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback manual en caso de error
      localStorage.clear();
      sessionStorage.clear();
      this.router.navigate(['/login']);
    }
  }
}
