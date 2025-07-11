import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { mapboxgl, initializeMapbox } from '../utils/mapbox-config';
import { RealTimeService, PetLocationData, PetIMUData, PetStatusData } from '../services/realtime.service';

@Component({
  selector: 'app-map-simple',
  template: `
    <div class="map-container">
      <div id="map-simple" class="mapbox-map"></div>
      
      <!-- Loading overlay con liquid glass y animaciones -->
      <div *ngIf="isLoading" class="map-loading-overlay">
        <div class="map-loading-backdrop"></div>
        <div class="map-loading-content liquid-glass animate-loading-in">
          <div class="loading-spinner-container">
            <div class="loading-spinner">
              <div class="spinner-ring"></div>
              <div class="spinner-ring"></div>
              <div class="spinner-ring"></div>
            </div>
          </div>
          <div class="loading-text">
            <h3>Cargando Mapa</h3>
            <p>Conectando con el sistema de seguimiento...</p>
          </div>
          <div class="loading-progress">
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div *ngIf="error" class="error">Error: {{ error }}</div>
      
      <!-- Popup minimalista para información de la mascota -->
      <div *ngIf="showPetPopup" class="pet-popup" [style.left.px]="popupPosition.x" [style.top.px]="popupPosition.y"
           (mouseenter)="onPopupMouseEnter()" (mouseleave)="onPopupMouseLeave()">
        <div class="pet-popup-content">
          <div class="pet-popup-header">
            <div class="pet-popup-info">
              <h3 class="pet-name">{{ selectedPet?.name || 'Tu Mascota' }}</h3>
              <p class="pet-breed">{{ selectedPet?.breed || 'Raza desconocida' }}</p>
            </div>
            <div class="pet-status-indicator" [ngClass]="getPetStatusInfo(selectedPet || {}).class">
              <span class="status-icon">{{ getPetStatusInfo(selectedPet || {}).icon }}</span>
              <span class="status-text">{{ getPetStatusInfo(selectedPet || {}).text }}</span>
            </div>
          </div>
          
          <div class="pet-popup-data">
            <div class="data-row" *ngIf="lastIMUUpdate">
              <i class="fas" [class]="getActivityIcon(lastIMUUpdate.activityState)"></i>
              <span>{{ getActivityText(lastIMUUpdate.activityState) }}</span>
            </div>
            
            <div class="data-row" *ngIf="lastStatusUpdate?.batteryLevel">
              <i class="fas fa-battery-three-quarters"></i>
              <span>{{ lastStatusUpdate?.batteryLevel }}%</span>
            </div>
            
            <div class="data-row" *ngIf="lastStatusUpdate?.signalStrength">
              <i class="fas fa-signal"></i>
              <span>{{ lastStatusUpdate?.signalStrength }}%</span>
            </div>
            
            <div class="data-row">
              <i class="fas fa-map-marker-alt"></i>
              <span>{{ selectedPet?.location || 'Lima, Perú' }}</span>
            </div>
            
            <div class="data-row">
              <i class="fas fa-clock"></i>
              <span>{{ selectedPet?.lastActivity || 'Hace 5 min' }}</span>
            </div>
            
            <div class="data-row connection-status" [class.online]="isRealtimeConnected">
              <i class="fas" [class]="isRealtimeConnected ? 'fa-wifi' : 'fa-wifi-slash'"></i>
              <span>{{ isRealtimeConnected ? 'Conectado' : 'Desconectado' }}</span>
            </div>
          </div>
        </div>
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
      background: var(--liquid-glass-bg);
      backdrop-filter: blur(var(--liquid-glass-blur));
      border: 1px solid var(--liquid-glass-border);
      color: var(--text-primary);
      padding: 20px;
      border-radius: var(--border-radius-lg);
      box-shadow: var(--liquid-glass-shadow);
    }

    /* Nueva pantalla de carga mejorada con liquid glass */
    .map-loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .map-loading-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      animation: backdropBlur 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .map-loading-content {
      position: relative;
      background: var(--liquid-glass-bg);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border: 1px solid var(--liquid-glass-border);
      border-radius: 32px;
      padding: 40px 32px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      text-align: center;
      max-width: 320px;
      width: 90%;
      animation: slideInScale 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .loading-spinner-container {
      margin-bottom: 24px;
    }

    .loading-spinner {
      width: 60px;
      height: 60px;
      position: relative;
      margin: 0 auto;
    }

    .spinner-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border: 3px solid transparent;
      border-radius: 50%;
      animation: spin 2s linear infinite;
    }

    .spinner-ring:nth-child(1) {
      border-top-color: var(--primary-color);
      animation-delay: 0s;
    }

    .spinner-ring:nth-child(2) {
      border-right-color: var(--secondary-color);
      animation-delay: 0.3s;
      width: 80%;
      height: 80%;
      top: 10%;
      left: 10%;
    }

    .spinner-ring:nth-child(3) {
      border-bottom-color: var(--success-color);
      animation-delay: 0.6s;
      width: 60%;
      height: 60%;
      top: 20%;
      left: 20%;
    }

    .loading-text h3 {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px 0;
      animation: fadeInUp 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s both;
    }

    .loading-text p {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0 0 24px 0;
      animation: fadeInUp 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.5s both;
    }

    .loading-progress {
      animation: fadeInUp 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.7s both;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary-color), var(--secondary-color), var(--success-color));
      border-radius: 2px;
      animation: progressFill 3s ease-in-out infinite;
      transform: translateX(-100%);
    }

    /* Animaciones */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes backdropBlur {
      from { 
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
      }
      to { 
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
    }

    @keyframes slideInScale {
      from {
        opacity: 0;
        transform: translateY(30px) scale(0.8);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes progressFill {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(0%); }
      100% { transform: translateX(100%); }
    }

    /* Animación de salida */
    .animate-loading-out {
      animation: slideOutScale 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }

    @keyframes slideOutScale {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(-30px) scale(0.8);
      }
    }

    @keyframes fadeOut {
      from { 
        opacity: 1;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      to { 
        opacity: 0;
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
      }
    }

    /* Popup minimalista para información de mascota - Estilo Apple */
    .pet-popup {
      position: fixed;
      z-index: 10000;
      transform: translateX(-50%);
      pointer-events: auto;
    }

    .pet-popup-content {
      background: var(--liquid-glass-bg);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border: 1px solid var(--liquid-glass-border);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3), 
                  0 12px 24px rgba(0, 0, 0, 0.15);
      min-width: 300px;
      max-width: 340px;
      opacity: 0;
      transform: translateY(20px) scale(0.9);
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: auto;
    }

    .pet-popup-content.popup-animate-in {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .pet-popup-content.popup-animate-out {
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .pet-popup-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      position: relative;
    }

    .pet-popup-avatar {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      object-fit: cover;
      border: 2px solid var(--liquid-glass-border);
    }

    .pet-popup-info {
      flex: 1;
    }

    .pet-popup-info .pet-name {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 2px 0;
    }

    .pet-popup-info .pet-breed {
      font-size: 12px;
      color: var(--text-secondary);
      margin: 0;
      opacity: 0.8;
    }

    .pet-status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 500;
      backdrop-filter: blur(8px);
    }

    .pet-status-indicator.status-lying {
      background: linear-gradient(135deg, rgba(255, 149, 0, 0.2), rgba(255, 204, 0, 0.2));
      border: 1px solid rgba(255, 149, 0, 0.3);
      color: #FF9500;
    }

    .pet-status-indicator.status-standing {
      background: linear-gradient(135deg, rgba(52, 199, 89, 0.2), rgba(48, 209, 88, 0.2));
      border: 1px solid rgba(52, 199, 89, 0.3);
      color: #34C759;
    }

    .pet-status-indicator.status-disconnected {
      background: linear-gradient(135deg, rgba(255, 59, 48, 0.2), rgba(255, 69, 58, 0.2));
      border: 1px solid rgba(255, 59, 48, 0.3);
      color: #FF3B30;
    }

    .pet-status-indicator.status-active {
      background: linear-gradient(135deg, rgba(0, 122, 255, 0.2), rgba(10, 132, 255, 0.2));
      border: 1px solid rgba(0, 122, 255, 0.3);
      color: #007AFF;
    }

    .status-icon {
      font-size: 12px;
    }

    .status-text {
      font-size: 10px;
      font-weight: 600;
    }

    .close-popup {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 50%;
      background: var(--liquid-glass-bg);
      backdrop-filter: blur(8px);
      border: 1px solid var(--liquid-glass-border);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .close-popup:hover {
      background: rgba(255, 59, 48, 0.1);
      color: #FF3B30;
      transform: scale(1.1);
    }

    .pet-name {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 14px;
    }

    .pet-popup-data {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .data-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      font-size: 13px;
      border-bottom: 1px solid var(--liquid-glass-border);
      transition: all 0.2s ease;
    }

    .data-row:last-child {
      border-bottom: none;
    }

    .data-row:hover {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 8px 12px;
      margin: 0 -12px;
    }

    .data-row i {
      width: 16px;
      text-align: center;
      color: var(--accent-color);
      opacity: 0.8;
      transition: all 0.2s ease;
    }

    .data-row:hover i {
      opacity: 1;
      transform: scale(1.1);
    }

    .data-row span {
      color: var(--text-primary);
      font-weight: 400;
    }

    .connection-status {
      margin-top: 4px;
    }

    .connection-status.online i {
      color: var(--success-color);
    }

    .connection-status:not(.online) i {
      color: var(--error-color);
    }

    /* Animaciones */
    @keyframes popupFadeIn {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    @keyframes popupFadeOut {
      from {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      to {
        opacity: 0;
        transform: translateX(-50%) translateY(-10px);
      }
    }

    /* Estilos para estados del marcador (optimizados para rendimiento) */
    .pet-marker.state-lying .pet-avatar {
      animation: lying-pulse 3s ease-in-out infinite;
      will-change: transform, opacity;
    }

    .pet-marker.state-standing .pet-avatar {
      animation: standing-pulse 2s ease-in-out infinite;
      will-change: transform;
    }

    .pet-marker.state-walking .pet-avatar {
      animation: walking-bounce 1.5s ease-in-out infinite;
      will-change: transform;
    }

    .pet-marker.state-running .pet-avatar {
      animation: running-shake 0.8s ease-in-out infinite;
      will-change: transform;
    }

    /* Optimización de animaciones para hardware acceleration */
    .pet-avatar {
      transform: translateZ(0); /* Force hardware acceleration */
      backface-visibility: hidden;
    }

    @keyframes lying-pulse {
      0%, 100% { 
        transform: translateZ(0) scale(1); 
        opacity: 0.9; 
      }
      50% { 
        transform: translateZ(0) scale(1.03); 
        opacity: 1; 
      }
    }

    @keyframes standing-pulse {
      0%, 100% { transform: translateZ(0) scale(1); }
      50% { transform: translateZ(0) scale(1.05); }
    }

    @keyframes walking-bounce {
      0%, 100% { transform: translateZ(0) translateY(0); }
      50% { transform: translateZ(0) translateY(-2px); }
    }

    @keyframes running-shake {
      0%, 100% { transform: translateZ(0) translateX(0); }
      25% { transform: translateZ(0) translateX(-1px); }
      75% { transform: translateZ(0) translateX(1px); }
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .pet-popup-content {
        min-width: 180px;
        padding: 12px;
      }
    }

    /* Marcador de ubicación del usuario con avatar de persona */
    .user-location-marker {
      position: relative;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-location-pulse {
      position: absolute;
      width: 70px;
      height: 70px;
      border: 2px solid #007AFF;
      border-radius: 50%;
      background: rgba(0, 122, 255, 0.1);
      animation: userLocationPulse 2s ease-out infinite;
      z-index: 1;
    }

    .user-location-avatar {
      position: relative;
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #007AFF, #0056CC);
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    .user-location-avatar i {
      font-size: 20px;
      color: white;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    }

    /* Animación pop para el avatar del usuario */
    .user-avatar-pop {
      animation: userAvatarPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    @keyframes userAvatarPop {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.3);
        box-shadow: 0 8px 25px rgba(0, 122, 255, 0.4);
      }
      100% {
        transform: scale(1);
      }
    }

    @keyframes userLocationPulse {
      0% {
        transform: scale(0.8);
        opacity: 1;
      }
      100% {
        transform: scale(1.4);
        opacity: 0;
      }
    }

    /* Marcadores de historial */
    .history-marker {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .history-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .history-time {
      background: rgba(0, 0, 0, 0.7);
      color: white;
      font-size: 10px;
      padding: 2px 4px;
      border-radius: 4px;
      margin-top: 4px;
      font-weight: 500;
    }

    /* Mejorar el círculo de precisión para que coincida con el avatar */
    .pulse-ring {
      position: absolute;
      width: 68px; /* Ligeramente más grande que el avatar de 60px */
      height: 68px;
      border: 2px solid currentColor;
      border-radius: 50%;
      background: transparent;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      z-index: -1;
    }

    .outer-ring {
      position: relative;
      width: 68px;
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    @keyframes pulse-ring {
      0% {
        transform: translate(-50%, -50%) scale(0.95);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(1.4);
        opacity: 0;
      }
    }

    /* Zona segura editable */
    .safe-zone-circle {
      position: relative;
      width: 200px;
      height: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    }

    .safe-zone-ring {
      position: absolute;
      width: 200px;
      height: 200px;
      border: 3px dashed #34C759;
      border-radius: 50%;
      background: rgba(52, 199, 89, 0.1);
      animation: safe-zone-pulse 3s ease-in-out infinite;
      transition: transform 0.3s ease;
    }

    .safe-zone-controls {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--liquid-glass-bg);
      backdrop-filter: blur(var(--liquid-glass-blur));
      border: 1px solid var(--liquid-glass-border);
      border-radius: 20px;
      padding: 8px 12px;
      z-index: 10;
    }

    .zone-size-btn {
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 50%;
      background: var(--success-color);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 10px;
      transition: var(--transition-fast);
    }

    .zone-size-btn:hover {
      background: #2a9d3f;
      transform: scale(1.1);
    }

    .safe-zone-label {
      color: var(--text-primary);
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }

    .zone-radius-indicator {
      position: absolute;
      bottom: -30px;
      background: rgba(52, 199, 89, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 600;
    }

    @keyframes safe-zone-pulse {
      0%, 100% {
        opacity: 0.6;
        transform: scale(1);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.02);
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
  private historyMarkers: mapboxgl.Marker[] = [];
  private currentZoneRadius = 100; // metros por defecto
  private subscriptions: Subscription[] = [];
  
  public isLoading = true;
  public error: string | null = null;
  public isRealtimeConnected = false;
  public isProduction = false;
  
  // Datos en tiempo real
  public lastLocationUpdate: PetLocationData | null = null;
  public lastIMUUpdate: PetIMUData | null = null;
  public lastStatusUpdate: PetStatusData | null = null;
  
  // Popup de información de mascota
  public showPetPopup = false;
  public popupPosition = { x: 0, y: 0 };
  public selectedPet: any = null;
  private popupTimeout: any = null;
  private isPopupHovered = false;
  
  // Pet location (Lima center for demo)
  private petLocation: [number, number] = [-77.0282, -12.1211];

  constructor(
    private realTimeService: RealTimeService,
    private cdr: ChangeDetectorRef
  ) {}

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
        this.hideLoadingWithAnimation();
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
        this.hideLoadingWithAnimation();
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      this.error = error instanceof Error ? error.message : 'Unknown error';
      this.hideLoadingWithAnimation();
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
    
    // Create HTML structure with larger, perfectly circular avatar (con punto de status)
    markerElement.innerHTML = `
      <div class="pulse-ring" style="border-color: ${petColor}66"></div>
      <div class="outer-ring" style="border-color: ${petColor}66; background: transparent;">
        <div class="pet-avatar" style="background: ${petGradient}; border: 4px solid white; border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; position: relative;">
          <i class="${petIcon}" style="color: white; font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>
        </div>
      </div>
      <div class="location-dot" style="background-color: ${petColor}"></div>
    `;

    // Add data attributes for styling purposes
    markerElement.setAttribute('data-pet-type', animal?.type || 'dog');
    markerElement.setAttribute('data-pet-name', animal?.name || 'Mascota');
    markerElement.setAttribute('data-pet-color', petColor);
    
    // Aplicar estado de actividad fijo para mascotas demo (excepto Max)
    if (animal?.activityState && animal.name !== 'Max') {
      markerElement.classList.add(`state-${animal.activityState}`);
      console.log(`Applied fixed activity state for ${animal.name}: ${animal.activityState}`);
    } else if (animal.name === 'Max') {
      console.log(`Max will receive dynamic activity updates from ESP32`);
    }
    
    console.log('Marker HTML created with icon:', petIcon);

    // Add hover events to marker with proper debouncing
    markerElement.addEventListener('mouseenter', (event) => {
      console.log('Pet marker hover enter!', animal.name);
      
      // Clear any pending close timeout
      if (this.popupTimeout) {
        clearTimeout(this.popupTimeout);
        this.popupTimeout = null;
      }
      
      this.selectedPet = animal;
      this.showPetPopupAtMarker(event);
    });

    markerElement.addEventListener('mouseleave', () => {
      console.log('Pet marker hover leave!', animal.name);
      
      // Don't close immediately, wait a bit to see if user moves to popup
      this.popupTimeout = setTimeout(() => {
        if (!this.isPopupHovered) {
          this.closePetPopup();
        }
      }, 200);
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

  // Add highlight animation to pet marker with modern pop effect
  private highlightPetMarker(): void {
    if (this.petMarker) {
      const markerElement = this.petMarker.getElement();
      const petAvatar = markerElement.querySelector('.pet-avatar') as HTMLElement;
      const petType = markerElement.getAttribute('data-pet-type') || 'dog';
      const petName = markerElement.getAttribute('data-pet-name') || 'Mascota';
      
      console.log(`Highlighting ${petType} marker for ${petName} with pop animation`);
      
      if (petAvatar) {
        // Add pop animation class
        petAvatar.classList.add('avatar-pop-highlight');
        
        // Remove the class after animation completes
        setTimeout(() => {
          petAvatar.classList.remove('avatar-pop-highlight');
        }, 600);
      }
      
      // Add CSS animation for the modern pop effect if not exists
      if (!document.getElementById('modern-pop-styles')) {
        const style = document.createElement('style');
        style.id = 'modern-pop-styles';
        style.textContent = `
          .avatar-pop-highlight {
            animation: avatarPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          }
          
          @keyframes avatarPop {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.4);
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            }
            100% {
              transform: scale(1);
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
    
    // Historiales únicos para cada mascota en Lima
    const historyRoutes: { [key: string]: [number, number][] } = {
      'Max': [
        [-77.0282, -12.1211], // Miraflores (actual)
        [-77.0265, -12.1195], // Hace 1 hora - Parque Kennedy
        [-77.0245, -12.1180], // Hace 2 horas - Larcomar
        [-77.0225, -12.1165], // Hace 3 horas - Malecón
        [-77.0205, -12.1150], // Hace 4 horas - Playa Waikiki
        [-77.0185, -12.1135]  // Hace 5 horas - Barranco
      ],
      'Luna': [
        [-77.0365, -12.1005], // San Isidro (actual)
        [-77.0350, -12.0990], // Hace 1 hora - Bosque El Olivar
        [-77.0335, -12.0975], // Hace 2 horas - Centro Financiero
        [-77.0320, -12.0960], // Hace 3 horas - Country Club
        [-77.0305, -12.0945], // Hace 4 horas - Golf Los Incas
        [-77.0290, -12.0930]  // Hace 5 horas - Jockey Plaza
      ],
      'Charlie': [
        [-77.0176, -12.1462], // Barranco (actual)
        [-77.0160, -12.1447], // Hace 1 hora - Puente de los Suspiros
        [-77.0145, -12.1432], // Hace 2 horas - Bajada de Baños
        [-77.0130, -12.1417], // Hace 3 horas - Chorrillos
        [-77.0115, -12.1402], // Hace 4 horas - La Herradura
        [-77.0100, -12.1387]  // Hace 5 horas - Agua Dulce
      ],
      'Bella': [
        [-76.9931, -12.1340], // Surco (actual)
        [-76.9915, -12.1325], // Hace 1 hora - CC Jockey Plaza
        [-76.9900, -12.1310], // Hace 2 horas - Parque de la Amistad
        [-76.9885, -12.1295], // Hace 3 horas - La Molina
        [-76.9870, -12.1280], // Hace 4 horas - Cieneguilla
        [-76.9855, -12.1265]  // Hace 5 horas - Pachacamac
      ]
    };

    const historyRoute = historyRoutes[petData.name] || historyRoutes['Max'];

    if (this.map && this.map.isStyleLoaded()) {
      // Remover historial anterior si existe
      this.hidePetHistory();

      // Crear fuente de datos para la ruta
      const routeId = `pet-history-route-${petData.name}`;
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

      // Añadir capa de la ruta con color específico de la mascota
      this.map.addLayer({
        'id': routeId,
        'type': 'line',
        'source': routeId,
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        },
        'paint': {
          'line-color': petData.color || '#34C759',
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
          <div class="history-dot" style="background-color: ${petData.color || '#34C759'}"></div>
          <div class="history-time">${index}h</div>
        `;

        const historyMarker = new mapboxgl.Marker(markerElement)
          .setLngLat(coord)
          .addTo(this.map);
        
        // Guardar referencia del marcador para poder eliminarlo después
        this.historyMarkers.push(historyMarker);
      });

      // Ajustar vista para mostrar toda la ruta
      const bounds = new mapboxgl.LngLatBounds();
      historyRoute.forEach(coord => bounds.extend(coord));
      this.map.fitBounds(bounds, { padding: 50 });
    }
  }

  // Método para ocultar el historial de la mascota del mapa
  public hidePetHistory(): void {
    console.log('Hiding pet history from map');
    
    if (this.map) {
      // Remover la capa de la ruta si existe
      if (this.historyPolyline) {
        try {
          if (this.map.getLayer(this.historyPolyline)) {
            this.map.removeLayer(this.historyPolyline);
          }
          if (this.map.getSource(this.historyPolyline)) {
            this.map.removeSource(this.historyPolyline);
          }
          this.historyPolyline = null;
        } catch (error) {
          console.warn('Error removing history polyline:', error);
        }
      }

      // Remover todos los marcadores de historial usando las referencias guardadas
      this.historyMarkers.forEach(marker => {
        try {
          marker.remove();
        } catch (error) {
          console.warn('Error removing history marker:', error);
        }
      });
      this.historyMarkers = [];

      // Regresar la vista al estado original (centrado en la mascota)
      if (this.petLocation) {
        this.map.flyTo({
          center: this.petLocation,
          zoom: 15,
          duration: 1000,
          essential: true
        });
      }

      console.log('Pet history hidden successfully');
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

      // Crear elemento del círculo de zona segura editable
      const safeZoneElement = document.createElement('div');
      safeZoneElement.className = 'safe-zone-circle';
      safeZoneElement.innerHTML = `
        <div class="safe-zone-ring"></div>
        <div class="safe-zone-controls">
          <button class="zone-size-btn decrease" onclick="window.adjustSafeZone('decrease')">
            <i class="fas fa-minus"></i>
          </button>
          <div class="safe-zone-label">Zona Segura</div>
          <button class="zone-size-btn increase" onclick="window.adjustSafeZone('increase')">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <div class="zone-radius-indicator">100m</div>
      `;

      // Añadir marcador de zona segura
      this.safeZoneCircle = new mapboxgl.Marker(safeZoneElement)
        .setLngLat(this.petLocation)
        .addTo(this.map);

      // Agregar método global para ajustar zona
      (window as any).adjustSafeZone = (action: string) => {
        this.adjustSafeZoneSize(action);
      };

      // Verificar si la mascota está dentro de la zona (simulado)
      const isInSafeZone = Math.random() > 0.3; // 70% de probabilidad de estar en zona segura
      
      if (!isInSafeZone) {
        this.showSafeZoneAlert();
      }
    }
  }

  // Método para ajustar el tamaño de la zona segura
  private adjustSafeZoneSize(action: string): void {
    if (action === 'increase') {
      this.currentZoneRadius = Math.min(this.currentZoneRadius + 25, 500); // Max 500m
    } else if (action === 'decrease') {
      this.currentZoneRadius = Math.max(this.currentZoneRadius - 25, 50); // Min 50m
    }

    // Actualizar indicador visual
    if (this.safeZoneCircle) {
      const safeZoneElement = this.safeZoneCircle.getElement();
      const radiusIndicator = safeZoneElement.querySelector('.zone-radius-indicator');
      const safeZoneRing = safeZoneElement.querySelector('.safe-zone-ring');
      
      if (radiusIndicator) {
        radiusIndicator.textContent = `${this.currentZoneRadius}m`;
      }
      
      if (safeZoneRing) {
        // Calcular escala basada en el radio (aproximación visual)
        const scale = this.currentZoneRadius / 100; // 100m = escala 1
        (safeZoneRing as HTMLElement).style.transform = `scale(${scale})`;
      }
    }
    
    console.log(`Safe zone radius adjusted to: ${this.currentZoneRadius}m`);
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
    
    // Si existe el marcador, actualizar su posición con animación optimizada
    if (this.petMarker && this.map) {
      // Usar setLngLat para movimiento fluido sin recentrar automáticamente
      this.petMarker.setLngLat(newCoordinates);
      
      // Solo centrar si la mascota está muy lejos de la vista actual
      const currentCenter = this.map.getCenter();
      const distance = this.calculateDistance(
        [currentCenter.lng, currentCenter.lat],
        newCoordinates
      );
      
      // Solo recentrar si la mascota está a más de 200 metros del centro actual
      if (distance > 0.002) { // ~200 metros aproximadamente
        this.map.flyTo({
          center: newCoordinates,
          duration: 1000,
          essential: true
        });
      }
      
      // Agregar animación de highlight más sutil para actualizaciones frecuentes
      this.subtleLocationUpdate();
    } else if (this.map) {
      // Si no existe marcador, crear uno nuevo con los datos actuales
      this.createRealtimePetMarker(locationData);
    }
  }

  // Método auxiliar para calcular distancia entre dos puntos
  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const dx = coord1[0] - coord2[0];
    const dy = coord1[1] - coord2[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Animación sutil para actualizaciones de ubicación
  private subtleLocationUpdate(): void {
    if (this.petMarker) {
      const markerElement = this.petMarker.getElement();
      const petAvatar = markerElement.querySelector('.pet-avatar') as HTMLElement;
      
      if (petAvatar) {
        petAvatar.classList.add('location-update-pulse');
        setTimeout(() => {
          petAvatar.classList.remove('location-update-pulse');
        }, 1000);
      }
      
      // Add CSS for subtle location update animation
      if (!document.getElementById('location-update-styles')) {
        const style = document.createElement('style');
        style.id = 'location-update-styles';
        style.textContent = `
          .location-update-pulse {
            animation: locationUpdatePulse 1s ease-out;
          }
          
          @keyframes locationUpdatePulse {
            0% {
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            50% {
              box-shadow: 0 6px 20px rgba(0, 122, 255, 0.3);
              transform: scale(1.05);
            }
            100% {
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
              transform: scale(1);
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }

  private updatePetActivity(imuData: PetIMUData): void {
    console.log('Actualizando actividad de mascota:', imuData.activityState);
    
    // Solo actualizar si es la mascota Max (que recibe datos del ESP32)
    if (this.petMarker) {
      const markerElement = this.petMarker.getElement();
      const petName = markerElement.getAttribute('data-pet-name');
      
      // Solo Max recibe actualizaciones del ESP32
      if (petName === 'Max') {
        // Optimización: solo cambiar si el estado es diferente
        const currentState = markerElement.className.match(/state-(\w+)/)?.[1];
        
        if (currentState !== imuData.activityState) {
          // Actualizar clases CSS según el estado con transición suave
          markerElement.classList.remove('state-lying', 'state-standing', 'state-walking', 'state-running');
          markerElement.classList.add(`state-${imuData.activityState}`);
          
          // Trigger a subtle animation for activity change
          this.triggerActivityChangeAnimation(markerElement, imuData.activityState);
          
          console.log(`Max activity updated from ${currentState} to: ${imuData.activityState}`);
        }
      }
    }
  }

  // Animación sutil para cambios de actividad
  private triggerActivityChangeAnimation(markerElement: HTMLElement, activityState: string): void {
    const petAvatar = markerElement.querySelector('.pet-avatar') as HTMLElement;
    
    if (petAvatar) {
      // Aplicar animación específica según la actividad
      petAvatar.classList.add(`activity-change-${activityState}`);
      
      setTimeout(() => {
        petAvatar.classList.remove(`activity-change-${activityState}`);
      }, 800);
    }
    
    // Add CSS for activity change animations
    if (!document.getElementById('activity-change-styles')) {
      const style = document.createElement('style');
      style.id = 'activity-change-styles';
      style.textContent = `
        .activity-change-lying {
          animation: activityLying 0.8s ease-out;
        }
        
        .activity-change-standing {
          animation: activityStanding 0.8s ease-out;
        }
        
        .activity-change-walking {
          animation: activityWalking 0.8s ease-out;
        }
        
        .activity-change-running {
          animation: activityRunning 0.8s ease-out;
        }
        
        @keyframes activityLying {
          0% { transform: scale(1); }
          50% { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        
        @keyframes activityStanding {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        @keyframes activityWalking {
          0% { transform: translateY(0); }
          25% { transform: translateY(-3px); }
          50% { transform: translateY(0); }
          75% { transform: translateY(-2px); }
          100% { transform: translateY(0); }
        }
        
        @keyframes activityRunning {
          0% { transform: translateX(0) scale(1); }
          25% { transform: translateX(-2px) scale(1.05); }
          50% { transform: translateX(2px) scale(1.05); }
          75% { transform: translateX(-1px) scale(1.05); }
          100% { transform: translateX(0) scale(1); }
        }
      `;
      document.head.appendChild(style);
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

  // Métodos para el popup de información con animaciones
  public showPetPopupAtMarker(event: MouseEvent): void {
    console.log('Intentando mostrar popup...');
    
    // Obtener la posición del marcador en la pantalla
    const markerElement = event.currentTarget as HTMLElement;
    const rect = markerElement.getBoundingClientRect();
    
    // Posicionar popup exactamente encima del marcador
    this.popupPosition = {
      x: rect.left + rect.width / 2, // Centrar horizontalmente
      y: rect.top - 180 // Posicionar encima del marcador con más margen
    };
    
    // Asegurar que el popup está visible
    this.showPetPopup = true;
    
    console.log('Popup activado. Posición:', this.popupPosition);
    console.log('showPetPopup:', this.showPetPopup);
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
    
    // Aplicar animación de entrada después de que el elemento se renderice
    setTimeout(() => {
      const popupElement = document.querySelector('.pet-popup-content');
      if (popupElement) {
        popupElement.classList.remove('popup-animate-out');
        popupElement.classList.add('popup-animate-in');
        console.log('Animación aplicada al popup');
      } else {
        console.error('No se encontró el elemento popup para animar');
      }
    }, 50);
  }

  public closePetPopup(): void {
    console.log('Cerrando popup...');
    
    // Clear any pending timeout
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
      this.popupTimeout = null;
    }
    
    this.isPopupHovered = false;
    
    const popupElement = document.querySelector('.pet-popup-content');
    if (popupElement) {
      popupElement.classList.remove('popup-animate-in');
      popupElement.classList.add('popup-animate-out');
      setTimeout(() => {
        this.showPetPopup = false;
        this.cdr.detectChanges();
        console.log('Popup cerrado');
      }, 200);
    } else {
      this.showPetPopup = false;
      this.cdr.detectChanges();
    }
  }

  // Nuevo método para obtener información del estado de la mascota
  public getPetStatusInfo(pet: any): { class: string, icon: string, text: string } {
    switch (pet.activityState) {
      case 'lying':
        return {
          class: 'status-lying',
          icon: '🛌',
          text: 'Descansando'
        };
      case 'standing':
        return {
          class: 'status-standing',
          icon: '🚶',
          text: 'De pie'
        };
      case 'disconnected':
        return {
          class: 'status-disconnected',
          icon: '📵',
          text: 'Desconectado'
        };
      default:
        return {
          class: 'status-active',
          icon: '✅',
          text: 'Activo'
        };
    }
  }

  // Método para mostrar la ubicación del usuario con avatar de persona y animación pop
  public showUserLocation(userCoordinates: [number, number]): void {
    console.log('Showing user location with person avatar:', userCoordinates);
    
    if (this.map) {
      // Crear elemento del marcador de usuario con avatar de persona
      const userMarkerElement = document.createElement('div');
      userMarkerElement.className = 'user-location-marker';
      userMarkerElement.innerHTML = `
        <div class="user-location-pulse"></div>
        <div class="user-location-avatar" id="user-avatar">
          <i class="fas fa-user"></i>
        </div>
      `;

      // Agregar marcador de usuario al mapa
      const userMarker = new mapboxgl.Marker(userMarkerElement)
        .setLngLat(userCoordinates)
        .addTo(this.map);

      // Aplicar animación pop al avatar después de un momento
      setTimeout(() => {
        const avatarElement = userMarkerElement.querySelector('.user-location-avatar') as HTMLElement;
        if (avatarElement) {
          avatarElement.classList.add('user-avatar-pop');
          
          // Remover la clase después de la animación
          setTimeout(() => {
            avatarElement.classList.remove('user-avatar-pop');
          }, 600);
        }
      }, 200);

      // Centrar el mapa en la ubicación del usuario con highlight
      this.map.flyTo({
        center: userCoordinates,
        zoom: 16,
        duration: 2000,
        essential: true
      });

      // Remover el marcador de usuario después de 8 segundos (más tiempo para apreciar la animación)
      setTimeout(() => {
        // Fade out suave antes de remover
        const avatarElement = userMarkerElement.querySelector('.user-location-avatar') as HTMLElement;
        if (avatarElement) {
          avatarElement.style.transition = 'opacity 0.5s ease-out';
          avatarElement.style.opacity = '0';
        }
        
        setTimeout(() => {
          userMarker.remove();
        }, 500);
      }, 8000);
    }
  }

  // Función para ocultar el loading con animación
  private hideLoadingWithAnimation(): void {
    const loadingElement = document.querySelector('.map-loading-content') as HTMLElement;
    const backdropElement = document.querySelector('.map-loading-backdrop') as HTMLElement;
    
    if (loadingElement && backdropElement) {
      // Agregar clase de animación de salida
      loadingElement.classList.add('animate-loading-out');
      
      // Animar la salida del backdrop
      backdropElement.style.animation = 'fadeOut 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
      
      // Esperar a que termine la animación antes de ocultar
      setTimeout(() => {
        this.isLoading = false;
      }, 500);
    } else {
      // Fallback si no se encuentran los elementos
      this.isLoading = false;
    }
  }

  // Métodos para manejar el hover del popup
  public onPopupMouseEnter(): void {
    console.log('Mouse enter popup');
    this.isPopupHovered = true;
    
    // Clear any pending close timeout
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
      this.popupTimeout = null;
    }
  }

  public onPopupMouseLeave(): void {
    console.log('Mouse leave popup');
    this.isPopupHovered = false;
    
    // Close popup after a short delay
    this.popupTimeout = setTimeout(() => {
      this.closePetPopup();
    }, 200);
  }
}
