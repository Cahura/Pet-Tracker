import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { mapboxgl, initializeMapbox } from '../utils/mapbox-config';
import { RealTimeService, PetLocationData, PetIMUData, PetStatusData } from '../services/realtime.service';

@Component({
  selector: 'app-map-simple',
  template: `
    <div class="map-container">
      <div id="map-simple" class="mapbox-map"></div>
      <div *ngIf="isLoading" class="loading">Loading map...</div>
      <div *ngIf="error" class="error">Error: {{ error }}</div>
      
      <!-- Panel de información en tiempo real -->
      <div class="realtime-panel" [class.connected]="isRealtimeConnected">
        <div class="connection-status">
          <i class="fas" [class]="isRealtimeConnected ? 'fa-wifi text-green' : 'fa-wifi-slash text-red'"></i>
          <span>{{ isRealtimeConnected ? 'Conectado' : 'Desconectado' }}</span>
        </div>
        
        <div *ngIf="lastLocationUpdate" class="data-panel">
          <h4><i class="fas fa-map-marker-alt"></i> Ubicación</h4>
          <p>Lat: {{ lastLocationUpdate.latitude.toFixed(6) }}</p>
          <p>Lng: {{ lastLocationUpdate.longitude.toFixed(6) }}</p>
          <p>Precisión: {{ lastLocationUpdate.accuracy?.toFixed(1) }}m</p>
          <p class="timestamp">{{ formatTimestamp(lastLocationUpdate.timestamp) }}</p>
        </div>

        <div *ngIf="lastIMUUpdate" class="data-panel">
          <h4><i class="fas fa-running"></i> Estado</h4>
          <p class="activity-state" [class]="'state-' + lastIMUUpdate.activityState">
            <i class="fas" [class]="getActivityIcon(lastIMUUpdate.activityState)"></i>
            {{ getActivityText(lastIMUUpdate.activityState) }}
          </p>
          <p class="timestamp">{{ formatTimestamp(lastIMUUpdate.timestamp) }}</p>
        </div>

        <div *ngIf="lastStatusUpdate" class="data-panel">
          <h4><i class="fas fa-info-circle"></i> Dispositivo</h4>
          <p>Estado: <span [class]="'status-' + lastStatusUpdate.status">{{ lastStatusUpdate.status }}</span></p>
          <p *ngIf="lastStatusUpdate.batteryLevel">Batería: {{ lastStatusUpdate.batteryLevel }}%</p>
          <p *ngIf="lastStatusUpdate.signalStrength">Señal: {{ lastStatusUpdate.signalStrength }}%</p>
        </div>
        
        <!-- Botón para simular datos en desarrollo -->
        <button *ngIf="!isProduction" class="simulate-btn" (click)="simulateData()">
          <i class="fas fa-play"></i> Simular Datos
        </button>
      </div>
    </div>
  `,
  styles: [`
    .map-container {
      width: 100%;
      height: 100vh;
      position: relative;
    }
    .mapbox-map {
      width: 100%;
      height: 100%;
    }
    .loading, .error {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 20px;
      border-radius: 5px;
    }

    /* Panel de datos en tiempo real */
    .realtime-panel {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 280px;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 16px;
      color: white;
      font-size: 14px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
    }

    .realtime-panel.connected {
      border-color: rgba(52, 199, 89, 0.3);
      box-shadow: 0 0 20px rgba(52, 199, 89, 0.2);
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .text-green { color: #34C759; }
    .text-red { color: #FF3B30; }

    .data-panel {
      margin-bottom: 12px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      border-left: 3px solid #34C759;
    }

    .data-panel h4 {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #34C759;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .data-panel p {
      margin: 4px 0;
      font-size: 12px;
    }

    .timestamp {
      color: #8E8E93;
      font-size: 11px;
      margin-top: 6px;
    }

    .activity-state {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: bold;
    }

    .state-lying { color: #007AFF; }
    .state-standing { color: #34C759; }
    .state-walking { color: #FF9500; }
    .state-running { color: #FF3B30; }

    .status-online { color: #34C759; }
    .status-offline { color: #8E8E93; }

    .simulate-btn {
      width: 100%;
      padding: 8px;
      background: linear-gradient(135deg, #007AFF, #5856D6);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;
    }

    .simulate-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
    }

    /* Estilos para estados del marcador */
    .pet-marker.state-lying .pet-avatar {
      animation: lying-pulse 2s ease-in-out infinite;
    }

    .pet-marker.state-standing .pet-avatar {
      animation: standing-pulse 1.5s ease-in-out infinite;
    }

    .pet-marker.state-walking .pet-avatar {
      animation: walking-bounce 1s ease-in-out infinite;
    }

    .pet-marker.state-running .pet-avatar {
      animation: running-shake 0.5s ease-in-out infinite;
    }

    @keyframes lying-pulse {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.05); opacity: 1; }
    }

    @keyframes standing-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }

    @keyframes walking-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    @keyframes running-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px); }
      75% { transform: translateX(2px); }
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .realtime-panel {
        width: calc(100% - 40px);
        top: 10px;
        right: 20px;
        left: 20px;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class MapSimpleComponent implements OnInit, OnDestroy {
  private map!: mapboxgl.Map;
  private petMarker!: mapboxgl.Marker;
  private safeZoneCircle: mapboxgl.Marker | null = null;
  private historyPolyline: string | null = null;
  private subscriptions: Subscription[] = [];
  
  public isLoading = true;
  public error: string | null = null;
  public isRealtimeConnected = false;
  public isProduction = false;
  
  // Datos en tiempo real
  public lastLocationUpdate: PetLocationData | null = null;
  public lastIMUUpdate: PetIMUData | null = null;
  public lastStatusUpdate: PetStatusData | null = null;
  
  // Pet location (Madrid center for demo)
  private petLocation: [number, number] = [-3.7038, 40.4168];

  constructor(private realTimeService: RealTimeService) {}

  ngOnInit() {
    this.isProduction = false; // Será reemplazado por environment.production
    this.initializeMap();
    this.initializeRealTimeService();
  }

  ngOnDestroy() {
    // Limpiar suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    if (this.petMarker) {
      this.petMarker.remove();
    }
    if (this.map) {
      this.map.remove();
    }
    
    // Desconectar servicio en tiempo real
    this.realTimeService.disconnect();
  }

  private async initializeMap() {
    try {
      console.log('Initializing Mapbox...');
      initializeMapbox();
      
      console.log('Mapbox access token:', mapboxgl.accessToken ? 'SET' : 'NOT SET');
      
      // Wait for container
      await this.waitForContainer();
      
      console.log('Creating map...');
      this.map = new mapboxgl.Map({
        container: 'map-simple',
        style: 'mapbox://styles/mapbox/dark-v11', // Volver al estilo dark original
        center: this.petLocation,
        zoom: 15
      });

      this.map.on('load', () => {
        console.log('Map loaded successfully!');
        this.customizeMapStyle();
        // Don't add default marker - wait for pet data from service
        this.isLoading = false;
      });

      // Listener adicional para asegurar que el texto se mejore después de cargar el estilo
      this.map.on('styledata', () => {
        if (this.map.isStyleLoaded()) {
          this.improveTextVisibility();
        }
      });

      this.map.on('error', (e) => {
        console.error('Map error:', e);
        this.error = e.error?.message || 'Unknown error';
        this.isLoading = false;
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      this.error = error instanceof Error ? error.message : 'Unknown error';
      this.isLoading = false;
    }
  }

  private waitForContainer(): Promise<void> {
    return new Promise((resolve) => {
      const checkContainer = () => {
        const container = document.getElementById('map-simple');
        if (container) {
          resolve();
        } else {
          setTimeout(checkContainer, 100);
        }
      };
      checkContainer();
    });
  }

  private addPetMarker(): void {
    // Don't create a default marker - wait for the actual pet data
    // This method is now only called when we have actual pet data
  }

  private updateMarkerSize(): void {
    if (this.petMarker) {
      const zoom = this.map.getZoom();
      const markerElement = this.petMarker.getElement();
      
      // Remove existing zoom classes
      markerElement.classList.remove('zoom-out', 'zoom-far-out');
      
      // Apply responsive classes based on zoom level
      if (zoom < 12) {
        markerElement.classList.add('zoom-far-out');
      } else if (zoom < 14) {
        markerElement.classList.add('zoom-out');
      }
      // Normal size for zoom >= 14
      
      console.log(`Updated marker size for zoom level: ${zoom}`);
    }
  }

  // Update pet marker with new animal data
  public updatePetMarker(animal: any): void {
    console.log('updatePetMarker called with animal:', animal);
    
    if (this.petMarker) {
      // Remove existing marker
      this.petMarker.remove();
    }
    
    // Update pet location
    if (animal.coordinates) {
      this.petLocation = animal.coordinates;
    }
    
    // Create new marker with updated animal data
    this.addPetMarkerWithAnimal(animal);
  }

  // Add pet marker with specific animal data
  private addPetMarkerWithAnimal(animal: any): void {
    console.log('Creating marker for animal:', animal);
    
    const markerElement = document.createElement('div');
    markerElement.className = 'pet-marker entering';
    
    // Use animal data or fallback to defaults
    const petIcon = animal?.icon || 'fas fa-dog';
    const petGradient = animal?.gradient || 'linear-gradient(135deg, #FF6B35, #F7931E)';
    const petColor = animal?.color || '#FF6B35';
    
    console.log('Using pet data:', { petIcon, petGradient, petColor });
    
    // Create HTML structure with larger, perfectly circular avatar y punto de status
    markerElement.innerHTML = `
      <div class="pulse-ring" style="border-color: ${petColor}66"></div>
      <div class="outer-ring" style="border-color: ${petColor}66; background: transparent;">
        <div class="pet-avatar" style="background: ${petGradient}; border: 4px solid white; border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; position: relative;">
          <div class="pet-status ${animal?.status || 'online'}" style="position: absolute; top: -4px; right: -4px; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; background: ${animal?.status === 'offline' ? '#8E8E93' : '#34C759'}; z-index: 4;"></div>
          <i class="${petIcon}" style="color: white; font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>
        </div>
      </div>
      <div class="location-dot" style="background-color: ${petColor}"></div>
    `;

    // Add data attributes for styling purposes
    markerElement.setAttribute('data-pet-type', animal?.type || 'dog');
    markerElement.setAttribute('data-pet-name', animal?.name || 'Mascota');
    markerElement.setAttribute('data-pet-color', petColor);
    
    console.log('Marker HTML created with icon:', petIcon);

    // Add click event to marker
    markerElement.addEventListener('click', () => {
      console.log('Pet marker clicked!', animal.name);
      this.centerOnPet();
    });

    // Create and add marker to map
    this.petMarker = new mapboxgl.Marker(markerElement)
      .setLngLat(this.petLocation)
      .addTo(this.map);

    // Add zoom listener to update marker size (remove previous listeners)
    this.map.off('zoom', this.updateMarkerSize);
    this.map.on('zoom', () => {
      this.updateMarkerSize();
    });

    // Set initial marker size based on current zoom
    this.updateMarkerSize();
    
    // Add entrance animation after a short delay
    setTimeout(() => {
      markerElement.classList.remove('entering');
    }, 300);
    
    console.log(`Pet marker created for ${animal.name} with icon: ${petIcon}`);
  }

  // Helper function to convert hex to RGB values
  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `${r}, ${g}, ${b}`;
    }
    return '52, 199, 89'; // Default green RGB
  }

  // Initialize map with specific animal
  public initializeWithAnimal(animal: any): void {
    console.log('initializeWithAnimal called with animal:', animal);
    
    if (animal) {
      // Update location and add marker with the specific animal data
      if (animal.coordinates) {
        this.petLocation = animal.coordinates;
        this.updateLocation(animal.coordinates);
      }
      
      // Create the marker with the specific animal
      this.addPetMarkerWithAnimal(animal);
    }
  }

  // Update map location to new coordinates
  public updateLocation(coordinates: [number, number]): void {
    console.log('updateLocation called with coordinates:', coordinates);
    if (this.map && coordinates) {
      this.petLocation = coordinates;
      console.log('Flying to new location:', coordinates);
      this.map.flyTo({
        center: coordinates,
        zoom: 15,
        duration: 2000,
        essential: true
      });
    } else {
      console.warn('Map or coordinates not available:', { map: !!this.map, coordinates });
    }
  }

  // Method to center map on pet location with highlight animation
  public centerOnPet(): void {
    if (this.map && this.petLocation) {
      console.log('Centering on pet with highlight animation');
      
      // Add highlight animation to marker
      this.highlightPetMarker();
      
      // Fly to pet location with higher zoom
      this.map.flyTo({
        center: this.petLocation,
        zoom: 18,
        duration: 2000,
        essential: true
      });
    }
  }

  // Add highlight animation to pet marker
  private highlightPetMarker(): void {
    if (this.petMarker) {
      const markerElement = this.petMarker.getElement();
      const petType = markerElement.getAttribute('data-pet-type') || 'dog';
      const petName = markerElement.getAttribute('data-pet-name') || 'Mascota';
      const petColor = markerElement.getAttribute('data-pet-color') || '#34C759';
      
      console.log(`Highlighting ${petType} marker for ${petName}`);
      
      // Add highlight class for animation
      markerElement.classList.add('highlighted');
      
      // Add a temporary highlight ring for extra visual effect
      const highlightRing = document.createElement('div');
      highlightRing.className = 'highlight-temp-ring';
      
      highlightRing.style.cssText = `
        position: absolute;
        width: 140px;
        height: 140px;
        border: 3px solid ${petColor};
        border-radius: 50%;
        background: transparent;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        animation: temp-highlight-ring 3s ease-out forwards;
        z-index: -1;
        box-sizing: border-box;
        aspect-ratio: 1 / 1;
      `;
      
      markerElement.appendChild(highlightRing);
      
      // Remove highlight effects after animation completes
      setTimeout(() => {
        markerElement.classList.remove('highlighted');
        if (highlightRing.parentNode) {
          highlightRing.parentNode.removeChild(highlightRing);
        }
      }, 3000);
      
      // Add CSS animation for the temporary ring if not exists
      if (!document.getElementById('temp-highlight-styles')) {
        const style = document.createElement('style');
        style.id = 'temp-highlight-styles';
        style.textContent = `
          @keyframes temp-highlight-ring {
            0% {
              transform: translate(-50%, -50%) scale(0.8);
              opacity: 0.8;
              border-width: 3px;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.5);
              opacity: 0.4;
              border-width: 2px;
            }
            100% {
              transform: translate(-50%, -50%) scale(2.2);
              opacity: 0;
              border-width: 1px;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }

  // Zoom in method
  public zoomIn(): void {
    if (this.map) {
      this.map.zoomIn({ duration: 300 });
    }
  }

  // Zoom out method
  public zoomOut(): void {
    if (this.map) {
      this.map.zoomOut({ duration: 300 });
    }
  }

  // Get current map instance (for external access)
  public getMap(): mapboxgl.Map | null {
    return this.map || null;
  }

  private customizeMapStyle(): void {
    // Esperar a que el estilo esté completamente cargado
    if (!this.map.isStyleLoaded()) {
      this.map.once('styledata', () => {
        this.customizeMapStyle();
      });
      return;
    }

    try {
      // Custom colors for parks and green areas
      if (this.map.getLayer('landuse')) {
        this.map.setPaintProperty('landuse', 'fill-color', [
          'match',
          ['get', 'class'],
          'park',
          '#2d5a3d', // Dark forest green for parks
          'wood',
          '#1a4d2e', // Darker green for woods
          'grass',
          '#4a7c59', // Medium green for grass
          'cemetery',
          '#3d5a45', // Muted green for cemeteries
          'golf_course',
          '#2e5233', // Professional green for golf courses
          'recreation_ground',
          '#35593f', // Recreation green
          'pitch',
          '#4a7c59', // Sports field green
          '#2d2d2d' // Default dark color
        ]);
      }

      // Water bodies styling
      if (this.map.getLayer('water')) {
        this.map.setPaintProperty('water', 'fill-color', [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          '#1a365d', // Deep blue for ocean/large water bodies
          10,
          '#2c5282', // Medium blue for rivers/lakes
          15,
          '#3182ce' // Lighter blue for small water features
        ]);
      }

      // Rivers and waterways
      if (this.map.getLayer('waterway')) {
        this.map.setPaintProperty('waterway', 'line-color', '#4299e1');
        this.map.setPaintProperty('waterway', 'line-width', [
          'interpolate',
          ['linear'],
          ['zoom'],
          8,
          1,
          16,
          4
        ]);
      }

      // Make buildings slightly more transparent
      if (this.map.getLayer('building')) {
        this.map.setPaintProperty('building', 'fill-opacity', 0.7);
        this.map.setPaintProperty('building', 'fill-color', '#404040');
      }

      // Try to style roads with different layer names
      const roadLayers = ['road-simple', 'road-primary', 'road-secondary', 'road-street', 'road-arterial'];
      roadLayers.forEach(layerName => {
        if (this.map.getLayer(layerName)) {
          this.map.setPaintProperty(layerName, 'line-color', '#4a4a4a');
        }
      });

      // Mejorar visibilidad de texto de calles, lugares y POIs
      this.improveTextVisibility();

      console.log('Map style customized successfully!');
    } catch (error) {
      console.warn('Error customizing map style:', error);
    }
  }

  private improveTextVisibility(): void {
    // Esperar a que todas las capas estén cargadas
    setTimeout(() => {
      // Obtener todas las capas del mapa
      const layers = this.map.getStyle().layers;
      
      // Mejorar todas las capas de texto
      layers.forEach(layer => {
        if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
          const layerId = layer.id;
          
          try {
            // Aplicar estilo de texto mejorado para mayor contraste
            this.map.setPaintProperty(layerId, 'text-color', '#ffffff');
            this.map.setPaintProperty(layerId, 'text-halo-color', '#000000');
            this.map.setPaintProperty(layerId, 'text-halo-width', 1.5);
            this.map.setPaintProperty(layerId, 'text-halo-blur', 0.5);
            
            // Ajustar opacidad según el tipo de texto
            if (layerId.includes('road') || layerId.includes('street')) {
              this.map.setPaintProperty(layerId, 'text-opacity', 1.0);
            } else if (layerId.includes('poi') || layerId.includes('place')) {
              this.map.setPaintProperty(layerId, 'text-opacity', 0.95);
            } else if (layerId.includes('water')) {
              this.map.setPaintProperty(layerId, 'text-color', '#87CEEB');
              this.map.setPaintProperty(layerId, 'text-opacity', 0.9);
            }
          } catch (error) {
            console.warn(`Could not style text layer ${layerId}:`, error);
          }
        }
      });
      
      console.log('Text visibility improved for dark map style');
    }, 1500); // Aumentar el delay para asegurar que el estilo dark esté completamente cargado
  }

  // Método para mostrar el historial de la mascota en el mapa
  public showPetHistory(petData: any): void {
    console.log('Showing pet history on map for:', petData.name);
    
    // Coordenadas de ejemplo para el historial (ruta simulada)
    const historyRoute: [number, number][] = [
      [-3.7038, 40.4168], // Posición actual
      [-3.7025, 40.4155], // Hace 1 hora
      [-3.7010, 40.4145], // Hace 2 horas
      [-3.7000, 40.4130], // Hace 3 horas
      [-3.6985, 40.4120], // Hace 4 horas
      [-3.6975, 40.4110], // Hace 5 horas
    ];

    if (this.map && this.map.isStyleLoaded()) {
      // Remover historial anterior si existe
      if (this.historyPolyline) {
        this.map.removeLayer(this.historyPolyline);
        this.map.removeSource(this.historyPolyline);
      }

      // Crear fuente de datos para la ruta
      const routeId = 'pet-history-route';
      this.historyPolyline = routeId;

      this.map.addSource(routeId, {
        'type': 'geojson',
        'data': {
          'type': 'Feature',
          'properties': {},
          'geometry': {
            'type': 'LineString',
            'coordinates': historyRoute
          }
        }
      });

      // Añadir capa de la ruta
      this.map.addLayer({
        'id': routeId,
        'type': 'line',
        'source': routeId,
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        },
        'paint': {
          'line-color': '#34C759',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });

      // Añadir puntos de historial
      historyRoute.forEach((coord, index) => {
        if (index === 0) return; // Saltar el punto actual

        const markerElement = document.createElement('div');
        markerElement.className = 'history-marker';
        markerElement.innerHTML = `
          <div class="history-dot"></div>
          <div class="history-time">${index}h</div>
        `;

        new mapboxgl.Marker(markerElement)
          .setLngLat(coord)
          .addTo(this.map);
      });

      // Ajustar vista para mostrar toda la ruta
      const bounds = new mapboxgl.LngLatBounds();
      historyRoute.forEach(coord => bounds.extend(coord));
      this.map.fitBounds(bounds, { padding: 50 });
    }
  }

  // Método para mostrar zona segura
  public showSafeZone(petData: any): void {
    console.log('Showing safe zone on map for:', petData.name);
    
    if (this.map && this.map.isStyleLoaded()) {
      // Remover zona segura anterior si existe
      if (this.safeZoneCircle) {
        this.safeZoneCircle.remove();
      }

      // Crear elemento del círculo de zona segura
      const safeZoneElement = document.createElement('div');
      safeZoneElement.className = 'safe-zone-circle';
      safeZoneElement.innerHTML = `
        <div class="safe-zone-ring"></div>
        <div class="safe-zone-label">Zona Segura</div>
      `;

      // Añadir marcador de zona segura
      this.safeZoneCircle = new mapboxgl.Marker(safeZoneElement)
        .setLngLat(this.petLocation)
        .addTo(this.map);

      // Verificar si la mascota está dentro de la zona (simulado)
      const isInSafeZone = Math.random() > 0.3; // 70% de probabilidad de estar en zona segura
      
      if (!isInSafeZone) {
        this.showSafeZoneAlert();
      }
    }
  }

  // Método para ocultar zona segura
  public hideSafeZone(): void {
    if (this.safeZoneCircle) {
      this.safeZoneCircle.remove();
      this.safeZoneCircle = null;
    }
  }

  // Método para mostrar alerta de zona segura
  private showSafeZoneAlert(): void {
    // Crear elemento de alerta
    const alertElement = document.createElement('div');
    alertElement.className = 'safe-zone-alert';
    alertElement.innerHTML = `
      <div class="alert-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <div class="alert-text">
        <strong>¡Alerta!</strong><br>
        ${this.getCurrentPetName()} está fuera de la zona segura
      </div>
    `;

    // Añadir al DOM
    document.body.appendChild(alertElement);

    // Remover después de 5 segundos
    setTimeout(() => {
      if (alertElement.parentNode) {
        alertElement.parentNode.removeChild(alertElement);
      }
    }, 5000);
  }

  private getCurrentPetName(): string {
    // Obtener nombre de la mascota actual (puedes mejorarlo con un servicio)
    return 'Tu mascota';
  }

  // Métodos para el servicio en tiempo real
  private initializeRealTimeService(): void {
    // Suscribirse a los datos de conexión
    const connectionSub = this.realTimeService.connection$.subscribe(connected => {
      this.isRealtimeConnected = connected;
      console.log('Conexión en tiempo real:', connected ? 'Conectada' : 'Desconectada');
    });

    // Suscribirse a los datos de ubicación
    const locationSub = this.realTimeService.location$.subscribe(locationData => {
      if (locationData) {
        this.lastLocationUpdate = locationData;
        this.updatePetLocation(locationData);
      }
    });

    // Suscribirse a los datos IMU
    const imuSub = this.realTimeService.imuData$.subscribe(imuData => {
      if (imuData) {
        this.lastIMUUpdate = imuData;
        this.updatePetActivity(imuData);
      }
    });

    // Suscribirse a los datos de estado
    const statusSub = this.realTimeService.status$.subscribe(statusData => {
      if (statusData) {
        this.lastStatusUpdate = statusData;
        this.updatePetStatus(statusData);
      }
    });

    this.subscriptions.push(connectionSub, locationSub, imuSub, statusSub);
  }

  private updatePetLocation(locationData: PetLocationData): void {
    const newCoordinates: [number, number] = [locationData.longitude, locationData.latitude];
    
    console.log('Actualizando ubicación de mascota:', newCoordinates);
    
    // Actualizar ubicación interna
    this.petLocation = newCoordinates;
    
    // Si existe el marcador, actualizar su posición
    if (this.petMarker && this.map) {
      // Animar la transición del marcador
      this.petMarker.setLngLat(newCoordinates);
      
      // Opcional: centrar el mapa en la nueva ubicación
      this.map.flyTo({
        center: newCoordinates,
        duration: 1500,
        essential: true
      });
      
      // Agregar animación de highlight
      this.highlightPetMarker();
    } else if (this.map) {
      // Si no existe marcador, crear uno nuevo con los datos actuales
      this.createRealtimePetMarker(locationData);
    }
  }

  private updatePetActivity(imuData: PetIMUData): void {
    console.log('Actualizando actividad de mascota:', imuData.activityState);
    
    // Actualizar el marcador con el nuevo estado de actividad
    if (this.petMarker) {
      const markerElement = this.petMarker.getElement();
      
      // Actualizar clases CSS según el estado
      markerElement.classList.remove('state-lying', 'state-standing', 'state-walking', 'state-running');
      markerElement.classList.add(`state-${imuData.activityState}`);
      
      // Actualizar el ícono del avatar según la actividad
      const avatarIcon = markerElement.querySelector('.pet-avatar i');
      if (avatarIcon) {
        avatarIcon.className = `fas ${this.getActivityIcon(imuData.activityState)}`;
      }
    }
  }

  private updatePetStatus(statusData: PetStatusData): void {
    console.log('Actualizando estado de mascota:', statusData.status);
    
    if (this.petMarker) {
      const markerElement = this.petMarker.getElement();
      const statusElement = markerElement.querySelector('.pet-status');
      
      if (statusElement) {
        // Actualizar color del punto de estado
        const bgColor = statusData.status === 'online' ? '#34C759' : '#8E8E93';
        (statusElement as HTMLElement).style.backgroundColor = bgColor;
        
        // Agregar/quitar clases de estado
        statusElement.classList.remove('status-online', 'status-offline');
        statusElement.classList.add(`status-${statusData.status}`);
      }
    }
  }

  private createRealtimePetMarker(locationData: PetLocationData): void {
    const animal = {
      name: 'Mascota GPS',
      type: 'dog',
      icon: 'fas fa-dog',
      gradient: 'linear-gradient(135deg, #FF6B35, #F7931E)',
      color: '#FF6B35',
      status: this.lastStatusUpdate?.status || 'online',
      coordinates: [locationData.longitude, locationData.latitude] as [number, number]
    };
    
    this.addPetMarkerWithAnimal(animal);
  }

  // Métodos utilitarios para la UI
  public formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  public getActivityIcon(activityState: string): string {
    switch (activityState) {
      case 'lying': return 'fa-bed';
      case 'standing': return 'fa-standing';
      case 'walking': return 'fa-walking';
      case 'running': return 'fa-running';
      default: return 'fa-question';
    }
  }

  public getActivityText(activityState: string): string {
    switch (activityState) {
      case 'lying': return 'Echado';
      case 'standing': return 'Parado';
      case 'walking': return 'Caminando';
      case 'running': return 'Corriendo';
      default: return 'Desconocido';
    }
  }

  public simulateData(): void {
    console.log('Simulando datos de prueba...');
    this.realTimeService.simulateData();
  }
}
