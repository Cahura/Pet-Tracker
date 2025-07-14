import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { mapboxgl, initializeMapbox } from '../utils/mapbox-config';
import { PetLocationService, PetLocation, PetStatus } from '../services/pet-location';
import { PetSelectionService, PetData } from '../services/pet-selection.service';
import { Subscription } from 'rxjs';
import { io, Socket } from 'socket.io-client';

// Import Mapbox CSS
import 'mapbox-gl/dist/mapbox-gl.css';

@Component({
  selector: 'app-map',
  templateUrl: './map.html',
  styleUrls: ['./map.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class MapComponent implements OnInit, OnDestroy {
  private map!: mapboxgl.Map;
  private marker!: mapboxgl.Marker;
  private socket!: Socket;
  
  public isLoading = true;
  public petLocation: any = null;
  public petMarkerPosition = { x: 0, y: 0 };
  public currentPet: PetData | null = null;
  public socketConnected = false;
  
  private currentLocation: [number, number] = [-77.0317, -12.1165]; // Lima, Peru coordinates
  private locationSubscription!: Subscription;
  private statusSubscription!: Subscription;
  private petSubscription!: Subscription;
  private currentPetLocation!: PetLocation;
  private currentPetStatus!: PetStatus;

  constructor(
    private petLocationService: PetLocationService,
    private petSelectionService: PetSelectionService
  ) {}

  ngOnInit() {
    // Initialize Mapbox configuration
    initializeMapbox();
    this.subscribeToLocationUpdates();
    this.subscribeToPetUpdates();
    this.initializeSocket();
    this.initializeMap();
    
    // Add window resize listener
    window.addEventListener('resize', () => {
      if (this.map) {
        setTimeout(() => {
          this.map.resize();
        }, 100);
      }
    });
  }

  ngOnDestroy() {
    if (this.locationSubscription) {
      this.locationSubscription.unsubscribe();
    }
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
    if (this.petSubscription) {
      this.petSubscription.unsubscribe();
    }
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.map) {
      this.map.remove();
    }
  }

  onImageError(event: any) {
    // Show backup icon if image fails to load
    const img = event.target;
    const backupIcon = img.parentElement?.querySelector('.backup-icon');
    if (backupIcon) {
      img.style.display = 'none';
      backupIcon.style.display = 'flex';
      backupIcon.style.alignItems = 'center';
      backupIcon.style.justifyContent = 'center';
      backupIcon.style.width = '100%';
      backupIcon.style.height = '100%';
      backupIcon.style.color = 'white';
      backupIcon.style.fontSize = '20px';
    }
  }

  private initializeMap() {
    // Wait for the map container to be ready
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('Map container not found, retrying...');
      setTimeout(() => this.initializeMap(), 100);
      return;
    }

    // Ensure Mapbox is properly initialized
    if (!mapboxgl.accessToken) {
      console.error('Mapbox access token not set, initializing...');
      initializeMapbox();
      
      // Check again after initialization
      if (!mapboxgl.accessToken) {
        console.error('Failed to set Mapbox access token');
        this.isLoading = false;
        return;
      }
    }

    // Set container size explicitly
    mapContainer.style.width = '100%';
    mapContainer.style.height = '100%';
    mapContainer.style.minHeight = '100vh';

    try {
      console.log('Initializing map with access token:', mapboxgl.accessToken ? 'Token set' : 'No token');
      
      // Create the map instance with Apple Maps-like dark style
      const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v11', // Guaranteed dark style
        center: this.currentLocation,
        zoom: 15,
        pitch: 60, // More dramatic 3D perspective
        bearing: 0,
        antialias: true, // Smooth rendering
        attributionControl: false // Hide attribution for cleaner look
      });
      
      this.map = map;
      console.log('Map initialized successfully with dark theme');

      // Force map to resize to full container dimensions
      setTimeout(() => {
        if (this.map) {
          this.map.resize();
          console.log('Map resized to full container');
        }
      }, 100);

      // Additional resize after a longer delay to ensure full rendering
      setTimeout(() => {
        if (this.map) {
          this.map.resize();
          console.log('Map resized again for full rendering');
        }
      }, 500);

      // Add event listeners
      this.map.on('load', () => {
        this.isLoading = false;
        console.log('Map loaded successfully - applying dark theme enhancements');
        
        // Apply custom dark theme enhancements
        this.applyDarkThemeEnhancements();
        
        this.addPetMarker();
        this.addLocationTrail();
        this.addCustomLayer();
        this.setupMapEvents();
        console.log('Map loaded successfully with all features');
        
        // Final resize after all features are loaded
        setTimeout(() => {
          if (this.map) {
            this.map.resize();
            console.log('Final map resize completed');
          }
        }, 1000);
      });

      this.map.on('error', (e) => {
        console.error('Map error:', e);
        console.error('Error details:', e.error);
        this.isLoading = false;
      });

      this.map.on('style.load', () => {
        console.log('Map style loaded successfully');
      });

      this.map.on('sourcedata', (e) => {
        if (e.sourceId && e.isSourceLoaded) {
          console.log('Source data loaded:', e.sourceId);
        }
      });

      // Handle map resize
      this.map.on('resize', () => {
        console.log('Map resized');
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      console.error('Mapbox access token status:', mapboxgl.accessToken ? 'Set' : 'Not set');
      console.error('Map container element:', mapContainer);
      this.isLoading = false;
      
      // Try to display a helpful error message
      if (mapContainer) {
        mapContainer.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; text-align: center; flex-direction: column;">
            <h3>Error loading map</h3>
            <p>Please check the console for more details.</p>
            <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        `;
      }
    }
  }

  private subscribeToLocationUpdates() {
    this.locationSubscription = this.petLocationService.currentLocation$.subscribe(
      (location: PetLocation) => {
        this.currentPetLocation = location;
        this.currentLocation = [location.longitude, location.latitude];
        this.updateMapLocation();
      }
    );

    this.statusSubscription = this.petLocationService.status$.subscribe(
      (status: PetStatus) => {
        this.currentPetStatus = status;
        this.updateStatusDisplay();
      }
    );
  }

  private subscribeToPetUpdates() {
    this.petSubscription = this.petSelectionService.selectedPet$.subscribe(pet => {
      this.currentPet = pet;
    });
  }

  private initializeSocket() {
    // Conectar al servidor Socket.IO en Railway
    this.socket = io('https://pet-tracker-production.up.railway.app');
    
    this.socket.on('connect', () => {
      console.log('Socket conectado al servidor Railway');
      this.socketConnected = true;
    });
    
    this.socket.on('disconnect', () => {
      console.log('Socket desconectado del servidor Railway');
      this.socketConnected = false;
    });
    
    // Escuchar eventos de IMU
    this.socket.on('imu-data', (data) => {
      console.log('Datos IMU recibidos:', data);
      this.updatePetIMUData(data);
    });
    
    // Escuchar eventos de estado de actividad
    this.socket.on('activity-state', (data) => {
      console.log('Estado de actividad actualizado:', data);
      this.updatePetActivityState(data);
    });
  }

  private updatePetIMUData(imuData: any) {
    if (this.currentPet) {
      this.currentPet.imuData = imuData;
      this.petSelectionService.updatePetIMUData(this.currentPet.id, imuData);
    }
  }

  private updatePetActivityState(activityData: any) {
    if (this.currentPet) {
      this.currentPet.activityState = activityData.state;
      this.petSelectionService.updatePetActivityState(this.currentPet.id, activityData.state);
    }
  }

  private updateMapLocation() {
    if (this.marker) {
      this.marker.setLngLat(this.currentLocation);
    }
  }

  private updatePetMarkerPosition() {
    // Update the marker position based on current pet location
  }

  private updateStatusDisplay() {
    // Update the status display in the UI
  }

  private addPetMarker() {
    if (!this.map) return;

    console.log('Adding pet marker at:', this.currentLocation);

    // Create custom marker element
    const markerElement = document.createElement('div');
    markerElement.className = 'custom-pet-marker';
    markerElement.style.width = '40px';
    markerElement.style.height = '40px';
    markerElement.style.borderRadius = '50%';
    markerElement.style.background = '#007AFF';
    markerElement.style.border = '3px solid white';
    markerElement.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    markerElement.style.display = 'flex';
    markerElement.style.alignItems = 'center';
    markerElement.style.justifyContent = 'center';
    markerElement.style.color = 'white';
    markerElement.style.fontSize = '18px';
    markerElement.innerHTML = '<i class="fas fa-paw"></i>';

    // Create marker
    this.marker = new mapboxgl.Marker(markerElement)
      .setLngLat(this.currentLocation)
      .addTo(this.map);

    console.log('Pet marker added successfully');

    // Create popup with dark theme
    const popup = new mapboxgl.Popup({ 
      offset: 25,
      className: 'pet-popup',
      closeButton: false
    }).setHTML(`
      <div style="padding: 12px; background: #2d2d2d; color: white; border-radius: 8px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: white;">🐕 Max</h3>
        <p style="margin: 0; font-size: 14px; color: #a1a1a6;">Golden Retriever</p>
        <div style="margin-top: 8px; display: flex; gap: 12px; font-size: 12px;">
          <span style="color: #34c759;">🟢 En línea</span>
          <span style="color: #a1a1a6;">🔋 78%</span>
        </div>
      </div>
    `);

    this.marker.setPopup(popup);
  }

  private addLocationTrail() {
    if (!this.map) return;

    // Add pet's trail with Apple Maps blue color
    this.map.addSource('pet-trail', {
      'type': 'geojson',
      'data': {
        'type': 'Feature',
        'properties': {},
        'geometry': {
          'type': 'LineString',
          'coordinates': [
            this.currentLocation,
            [-3.7048, 40.4178],
            [-3.7058, 40.4188]
          ]
        }
      }
    });

    this.map.addLayer({
      'id': 'pet-trail',
      'type': 'line',
      'source': 'pet-trail',
      'layout': {
        'line-join': 'round',
        'line-cap': 'round'
      },
      'paint': {
        'line-color': '#007AFF',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });
  }

  private addCustomLayer() {
    if (!this.map) return;

    // Add custom layer for enhanced visual effects
    this.map.addLayer({
      'id': 'pet-area',
      'type': 'circle',
      'source': {
        'type': 'geojson',
        'data': {
          'type': 'FeatureCollection',
          'features': [{
            'type': 'Feature',
            'properties': {},
            'geometry': {
              'type': 'Point',
              'coordinates': this.currentLocation
            }
          }]
        }
      },
      'paint': {
        'circle-radius': 50,
        'circle-color': '#007AFF',
        'circle-opacity': 0.1,
        'circle-stroke-color': '#007AFF',
        'circle-stroke-width': 2,
        'circle-stroke-opacity': 0.3
      }
    });
  }

  private setupMapEvents() {
    if (!this.map) return;

    // Add click event for pet marker
    this.map.on('click', 'pet-area', (e) => {
      this.marker.togglePopup();
    });

    // Change cursor on hover
    this.map.on('mouseenter', 'pet-area', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', 'pet-area', () => {
      this.map.getCanvas().style.cursor = '';
    });
  }

  private updateLocationInfo() {
    // Update location information in the UI
    this.petLocation = {
      name: 'Max',
      status: 'En movimiento',
      location: 'Parque Central, Madrid',
      lastUpdate: new Date()
    };
  }

  public centerOnPet() {
    if (this.map && this.currentLocation) {
      this.map.flyTo({
        center: this.currentLocation,
        zoom: 16,
        essential: true
      });
    }
  }

  public centerOnLocation(location: [number, number]) {
    if (this.map) {
      this.map.flyTo({
        center: location,
        zoom: 16,
        essential: true
      });
    }
  }

  public zoomIn() {
    if (this.map) {
      this.map.zoomIn();
    }
  }

  public zoomOut() {
    if (this.map) {
      this.map.zoomOut();
    }
  }

  private applyDarkThemeEnhancements() {
    if (!this.map) return;
    
    // Apply additional dark theme customizations
    this.map.setPaintProperty('building', 'fill-color', '#2a2a2a');
    this.map.setPaintProperty('building', 'fill-opacity', 0.8);
    
    // Enhance roads for better visibility in dark mode
    try {
      this.map.setPaintProperty('road-primary', 'line-color', '#404040');
      this.map.setPaintProperty('road-secondary', 'line-color', '#363636');
      this.map.setPaintProperty('road-trunk', 'line-color', '#404040');
    } catch (e) {
      console.log('Some road layers not found, but that\'s okay');
    }
    
    // Add subtle glow effect to water bodies
    try {
      this.map.setPaintProperty('water', 'fill-color', '#1a237e');
    } catch (e) {
      console.log('Water layer not found, but that\'s okay');
    }
    
    console.log('Dark theme enhancements applied');
  }
}
