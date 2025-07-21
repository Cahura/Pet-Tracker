import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { mapboxgl, initializeMapbox } from '../utils/mapbox-config';
import { WebSocketService, PetData } from '../services/websocket.service';
import { PetSelectionService } from '../services/pet-selection.service';
import { NotificationService } from '../notification/notification';

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
            <div class="data-row" *ngIf="lastBatteryUpdate?.batteryLevel">
              <i class="fas fa-battery-three-quarters"></i>
              <span>{{ lastBatteryUpdate?.batteryLevel }}%</span>
            </div>
            
            <div class="data-row" *ngIf="lastBatteryUpdate?.signalStrength">
              <i class="fas fa-signal"></i>
              <span>Señal: {{ lastBatteryUpdate?.signalStrength }}%</span>
            </div>
            
            <div class="data-row" *ngIf="lastIMUUpdate?.gps_speed_kmh !== undefined && lastIMUUpdate.gps_speed_kmh > 0">
              <i class="fas fa-running"></i>
              <span>{{ lastIMUUpdate.gps_speed_kmh | number:'1.1-1' }} km/h</span>
            </div>
            
            <div class="data-row">
              <i class="fas fa-map-marker-alt"></i>
              <span>{{ getLocationName() }}</span>
            </div>
            
            <div class="data-row">
              <i class="fas fa-clock"></i>
              <span>{{ getLastUpdateTimeText() }}</span>
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

    .pet-status-indicator.status-walking {
      background: linear-gradient(135deg, rgba(88, 86, 214, 0.2), rgba(94, 92, 230, 0.2));
      border: 1px solid rgba(88, 86, 214, 0.3);
      color: #5856D6;
    }

    .pet-status-indicator.status-running {
      background: linear-gradient(135deg, rgba(255, 45, 85, 0.2), rgba(255, 55, 95, 0.2));
      border: 1px solid rgba(255, 45, 85, 0.3);
      color: #FF2D55;
    }

    .pet-status-indicator.status-disconnected {
      background: linear-gradient(135deg, rgba(255, 59, 48, 0.2), rgba(255, 69, 58, 0.2));
      border: 1px solid rgba(255, 59, 48, 0.3);
      color: #FF3B30;
    }

    .pet-status-indicator.status-resting {
      background: linear-gradient(135deg, rgba(52, 199, 89, 0.2), rgba(48, 209, 88, 0.2));
      border: 1px solid rgba(52, 199, 89, 0.3);
      color: #34C759;
    }

    .pet-status-indicator.status-walking {
      background: linear-gradient(135deg, rgba(255, 159, 10, 0.2), rgba(255, 149, 0, 0.2));
      border: 1px solid rgba(255, 159, 10, 0.3);
      color: #FF9F0A;
    }

    .pet-status-indicator.status-running {
      background: linear-gradient(135deg, rgba(255, 69, 58, 0.2), rgba(255, 59, 48, 0.2));
      border: 1px solid rgba(255, 69, 58, 0.3);
      color: #FF453A;
    }

    .pet-status-indicator.status-traveling {
      background: linear-gradient(135deg, rgba(0, 122, 255, 0.2), rgba(10, 132, 255, 0.2));
      border: 1px solid rgba(0, 122, 255, 0.3);
      color: #007AFF;
    }

    .pet-status-indicator.status-unknown {
      background: linear-gradient(135deg, rgba(142, 142, 147, 0.2), rgba(174, 174, 178, 0.2));
      border: 1px solid rgba(142, 142, 147, 0.3);
      color: #8E8E93;
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
    .pet-marker.state-resting .pet-avatar {
      animation: resting-pulse 3s ease-in-out infinite;
      will-change: transform, opacity;
    }

    .pet-marker.state-walking .pet-avatar {
      animation: walking-bounce 1.5s ease-in-out infinite;
      will-change: transform;
    }

    .pet-marker.state-running .pet-avatar {
      animation: running-shake 0.8s ease-in-out infinite;
      will-change: transform;
    }

    .pet-marker.state-traveling .pet-avatar {
      animation: traveling-glide 2s ease-in-out infinite;
      will-change: transform;
    }

    .pet-marker.state-disconnected .pet-avatar {
      animation: disconnected-fade 2s ease-in-out infinite;
      will-change: opacity;
    }

    /* Optimización de animaciones para hardware acceleration */
    .pet-avatar {
      transform: translateZ(0); /* Force hardware acceleration */
      backface-visibility: hidden;
    }

    @keyframes resting-pulse {
      0%, 100% { 
        transform: translateZ(0) scale(1); 
        opacity: 0.9; 
      }
      50% { 
        transform: translateZ(0) scale(1.03); 
        opacity: 1; 
      }
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

    @keyframes traveling-glide {
      0%, 100% { 
        transform: translateZ(0) translateX(0) scale(1); 
      }
      33% { 
        transform: translateZ(0) translateX(2px) scale(1.02); 
      }
      66% { 
        transform: translateZ(0) translateX(-2px) scale(1.02); 
      }
    }

    @keyframes disconnected-fade {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 0.8; }
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

    /* Marcadores de historial mejorados */
    .history-marker {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .history-marker:hover {
      transform: scale(1.1);
    }

    .history-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      transition: all 0.2s ease;
    }

    .history-marker:hover .history-dot {
      width: 16px;
      height: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .history-time {
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-size: 9px;
      padding: 3px 6px;
      border-radius: 6px;
      margin-top: 6px;
      font-weight: 600;
      letter-spacing: 0.3px;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
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
  public isRealtimeConnected = false; // Estado de conexión WebSocket
  public isESP32Connected = false; // Estado específico del ESP32C6 enviando datos
  public lastESP32DataTime: number = 0; // Timestamp de última recepción de datos del ESP32
  private esp32TimeoutMs = 30000; // 30 segundos de timeout para considerar desconectado
  public isProduction = false;
  
  // Datos en tiempo real optimizados
  public lastLocationUpdate: any = null;
  public lastIMUUpdate: any = null;
  public lastBatteryUpdate: any = null;
  
  // Popup de información de mascota
  public showPetPopup = false;
  public popupPosition = { x: 0, y: 0 };
  public selectedPet: any = null;
  private popupTimeout: any = null;
  private isPopupHovered = false;
  
  // Ubicación actual de la mascota (UPC Monterrico por defecto cuando ESP32C6 desconectado)
  private petLocation: [number, number] = [-76.9717, -12.0635]; // UPC Sede Monterrico
  private currentPetData: any = null;

  // Manejo de rutas inteligentes
  private activeRouteLayer: string | null = null;
  private routeHistory: Array<{
    id: string,
    points: Array<{lat: number, lng: number, timestamp: number, speed: number, activity: string}>,
    startTime: number,
    endTime: number,
    totalDistance: number
  }> = [];
  private isUserInteractingWithMap = false;
  private lastUserInteraction = 0;
  private userInteractionTimeout = 5000; // 5 segundos sin interacción antes de permitir auto-updates

  constructor(
    private webSocketService: WebSocketService,
    private cdr: ChangeDetectorRef,
    private petSelectionService: PetSelectionService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.isProduction = false; // Será reemplazado por environment.production
    this.initializeMap();
    this.initializeWebSocketService();
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
        
        // Agregar listeners para detectar interacción del usuario
        this.setupUserInteractionListeners();
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

    // Add hover events to marker with improved debugging
    markerElement.addEventListener('mouseenter', (event) => {
      console.log('🎯 HOVER DETECTED! Pet marker hover enter:', animal.name);
      console.log('🔍 Event details:', event);
      
      // Clear any pending close timeout
      if (this.popupTimeout) {
        clearTimeout(this.popupTimeout);
        this.popupTimeout = null;
        console.log('✅ Cleared pending timeout');
      }
      
      this.selectedPet = animal;
      console.log('✅ Selected pet set to:', this.selectedPet);
      
      // Force immediate popup show for testing
      this.showPetPopup = true;
      this.popupPosition = {
        x: event.clientX,
        y: event.clientY - 100
      };
      
      console.log('✅ Popup activated at position:', this.popupPosition);
      this.cdr.detectChanges();
      
      // Also call the original method
      this.showPetPopupAtMarker(event);
    });

    markerElement.addEventListener('mouseleave', (event) => {
      console.log('🎯 HOVER END! Pet marker hover leave:', animal.name);
      
      // Don't close immediately, wait a bit to see if user moves to popup
      this.popupTimeout = setTimeout(() => {
        if (!this.isPopupHovered) {
          console.log('⏰ Closing popup after timeout');
          this.closePetPopup();
        } else {
          console.log('⏸️ Popup still hovered, keeping open');
        }
      }, 300); // Increased timeout for easier testing
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
      // Guardar datos de la mascota actual
      this.currentPetData = animal;
      
      // Update location and add marker with the specific animal data
      if (animal.coordinates) {
        this.petLocation = animal.coordinates;
        this.updateLocation(animal.coordinates, true); // Solo centrar en la inicialización/cambio de mascota
      }
      
      // Remove existing marker if any
      if (this.petMarker) {
        this.petMarker.remove();
      }
      
      // Create the marker with the specific animal
      this.addPetMarkerWithAnimal(animal);
    }
  }

  // Update map location to new coordinates
  public updateLocation(coordinates: [number, number], shouldCenter: boolean = false): void {
    console.log('updateLocation called with coordinates:', coordinates, 'shouldCenter:', shouldCenter);
    if (this.map && coordinates) {
      this.petLocation = coordinates;
      
      // Solo centrar si se solicita explícitamente
      if (shouldCenter) {
        console.log('Flying to new location:', coordinates);
        this.map.flyTo({
          center: coordinates,
          zoom: 15,
          duration: 2000,
          essential: true
        });
      } else {
        console.log('Location updated without centering - user can center manually');
      }
    } else {
      console.warn('Map or coordinates not available:', { map: !!this.map, coordinates });
    }
  }

  // Method to center map on pet location with highlight animation (manual centering)
  public centerOnPet(): void {
    if (this.map && this.petLocation) {
      console.log('🎯 Centrando manualmente en la mascota con animación');
      
      // Add highlight animation to marker
      this.highlightPetMarker();
      
      // Fly to pet location with appropriate zoom
      this.map.flyTo({
        center: this.petLocation,
        zoom: Math.max(this.map.getZoom(), 16), // Usar zoom actual si es mayor que 16
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
    
    // Historiales únicos para cada mascota siguiendo calles REALES de Lima
    const historyRoutes: { [key: string]: [number, number][] } = {
      'Max': [
        // MAX - Ruta desde Calle Cantuarias y Pasaje Tello a Parque Kennedy
        [-77.0317, -12.1165], // Inicio: Calle Cantuarias con Pasaje Tello, Miraflores
        [-77.0315, -12.1162], // Por Calle Cantuarias hacia el norte
        [-77.0312, -12.1158], // Continuando por Cantuarias
        [-77.0308, -12.1155], // Girando hacia Av. José Pardo
        [-77.0305, -12.1153], // Av. José Pardo cuadra 1
        [-77.0300, -12.1150], // José Pardo cuadra 2
        [-77.0295, -12.1147], // José Pardo cuadra 3
        [-77.0290, -12.1145], // José Pardo cuadra 4
        [-77.0285, -12.1143], // José Pardo cuadra 5
        [-77.0280, -12.1141], // Llegando a Av. Larco
        [-77.0278, -12.1140], // Girando en Av. Larco hacia Parque Kennedy
        [-77.0276, -12.1138], // Av. Larco cuadra 10
        [-77.0274, -12.1136], // Av. Larco cuadra 11
        [-77.0272, -12.1134], // Entrando al área del Parque Kennedy
        [-77.0270, -12.1132], // Centro del Parque Kennedy - destino
        [-77.0272, -12.1135], // Regreso por otro sendero del parque
        [-77.0275, -12.1137], // Saliendo por Av. Larco
        [-77.0278, -12.1140], // De vuelta por Av. Larco
        [-77.0282, -12.1143], // Girando hacia José Pardo para regresar
        [-77.0285, -12.1145], // José Pardo de regreso cuadra 5
        [-77.0290, -12.1147], // José Pardo cuadra 4
        [-77.0295, -12.1150], // José Pardo cuadra 3
        [-77.0300, -12.1152], // José Pardo cuadra 2
        [-77.0305, -12.1155], // José Pardo cuadra 1
        [-77.0308, -12.1158], // Girando hacia Cantuarias
        [-77.0312, -12.1160], // Por Cantuarias de regreso
        [-77.0315, -12.1163], // Continuando por Cantuarias
        [-77.0317, -12.1165]  // De vuelta a casa: Cantuarias con Pasaje Tello
      ],
      'Luna': [
        [-76.9568, -12.0631], // Inicio: Casa en Santa Isabel
        [-76.9567, -12.0630], // Caminando por la calle residencial
        [-76.9566, -12.0628], // Hacia Av. Los Incas
        [-76.9565, -12.0627], // Por Av. Los Incas hacia el norte
        [-76.9564, -12.0625], // Continuando por Los Incas
        [-76.9563, -12.0624], // Girando hacia un parque local
        [-76.9562, -12.0622], // Explorando área verde
        [-76.9561, -12.0621], // En el parque jugando
        [-76.9562, -12.0622], // Regresando por área verde
        [-76.9564, -12.0623], // De vuelta por Los Incas
        [-76.9565, -12.0625], // Por la avenida principal
        [-76.9567, -12.0627], // Girando hacia casa
        [-76.9568, -12.0629], // Calle residencial de regreso
        [-76.9568, -12.0631]  // De vuelta a casa
      ],
      'Charlie': [
        // CHARLIE - Ruta turística por Barranco desde Plaza de Armas a Puente de los Suspiros
        [-77.0185, -12.1425], // Inicio: Plaza Municipal de Barranco
        [-77.0183, -12.1428], // Saliendo de la plaza por Jr. Lima
        [-77.0180, -12.1432], // Jr. Lima hacia el norte
        [-77.0178, -12.1435], // Continuando por Jr. Lima
        [-77.0175, -12.1438], // Jr. Lima cuadra 3
        [-77.0173, -12.1442], // Girando hacia Jr. Ayacucho
        [-77.0171, -12.1445], // Jr. Ayacucho hacia el malecón
        [-77.0169, -12.1448], // Continuando por Ayacucho
        [-77.0167, -12.1452], // Jr. Ayacucho llegando al área histórica
        [-77.0165, -12.1455], // Girando hacia Jr. Batallón Callao
        [-77.0164, -12.1458], // Jr. Batallón Callao
        [-77.0163, -12.1461], // Acercándose al Puente de los Suspiros
        [-77.0162, -12.1464], // Llegando al Puente de los Suspiros
        [-77.0161, -12.1467], // Explorando el área del puente
        [-77.0163, -12.1465], // Regresando por el área histórica
        [-77.0165, -12.1462], // De vuelta por Jr. Batallón Callao
        [-77.0167, -12.1459], // Girando hacia Jr. Ayacucho
        [-77.0169, -12.1456], // Jr. Ayacucho de regreso
        [-77.0171, -12.1453], // Continuando por Ayacucho
        [-77.0173, -12.1450], // Jr. Ayacucho hacia Jr. Lima
        [-77.0175, -12.1447], // Girando a Jr. Lima
        [-77.0178, -12.1444], // Jr. Lima de regreso cuadra 3
        [-77.0180, -12.1441], // Jr. Lima cuadra 2
        [-77.0183, -12.1437], // Jr. Lima cuadra 1
        [-77.0185, -12.1434], // Llegando a la plaza
        [-77.0185, -12.1425]  // De vuelta a Plaza Municipal de Barranco
      ],
      'Bella': [
        // BELLA - Ruta elegante por Surco desde Av. Primavera al Parque de la Amistad
        [-76.9925, -12.1280], // Inicio: Casa en Av. Primavera, Surco
        [-76.9923, -12.1278], // Saliendo por Av. Primavera hacia el norte
        [-76.9920, -12.1275], // Av. Primavera cuadra 12
        [-76.9918, -12.1273], // Av. Primavera cuadra 13
        [-76.9915, -12.1270], // Girando hacia Av. El Derby
        [-76.9912, -12.1268], // Av. El Derby cuadra 1
        [-76.9910, -12.1265], // Av. El Derby cuadra 2
        [-76.9908, -12.1263], // El Derby hacia Av. Velasco Astete
        [-76.9905, -12.1260], // Av. Velasco Astete
        [-76.9903, -12.1258], // Velasco Astete hacia el parque
        [-76.9900, -12.1255], // Acercándose al Parque de la Amistad
        [-76.9898, -12.1253], // Entrada del Parque de la Amistad
        [-76.9895, -12.1250], // Centro del parque - área de juegos
        [-76.9893, -12.1248], // Área verde norte del parque
        [-76.9895, -12.1251], // Regresando por sendero central
        [-76.9898, -12.1254], // Saliendo del parque
        [-76.9900, -12.1256], // De vuelta a Av. Velasco Astete
        [-76.9903, -12.1259], // Velasco Astete de regreso
        [-76.9905, -12.1261], // Hacia Av. El Derby
        [-76.9908, -12.1264], // Av. El Derby de regreso cuadra 2
        [-76.9910, -12.1266], // El Derby cuadra 1
        [-76.9912, -12.1269], // Girando a Av. Primavera
        [-76.9915, -12.1271], // Av. Primavera cuadra 13
        [-76.9918, -12.1274], // Av. Primavera cuadra 12
        [-76.9920, -12.1276], // Av. Primavera hacia casa
        [-76.9923, -12.1279], // Llegando a casa
        [-76.9925, -12.1280]  // De vuelta a casa en Av. Primavera
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

      // Etiquetas descriptivas para cada punto de la ruta
      const routeLabels: { [key: string]: string[] } = {
        'Max': [
          'Inicio', 'Av. Larco', 'Av. Larco', 'José Pardo', 'José Pardo', 
          'Malecón', 'Malecón', 'P. Amor', 'P. Amor', 'Regreso', 'Diagonal', 'Schell'
        ],
        'Luna': [
          'Inicio', 'El Rosario', 'El Rosario', 'R. Panamá', 'R. Panamá', 
          'J. Prado', 'Begonias', 'Regreso'
        ],
        'Charlie': [
          'Inicio', 'Batallón', 'Bajada', 'Bajada', 'Playa', 'Malecón', 'Av. Grau'
        ],
        'Bella': [
          'Inicio', 'Caminos', 'Caminos', 'Benavides', 'Benavides', 
          'Jockey', 'J. Prado', 'Eucaliptos'
        ]
      };

      const labels = routeLabels[petData.name] || routeLabels['Max'];

      // Añadir puntos de historial con etiquetas descriptivas
      historyRoute.forEach((coord, index) => {
        if (index === 0) return; // Saltar el punto actual

        const markerElement = document.createElement('div');
        markerElement.className = 'history-marker';
        markerElement.innerHTML = `
          <div class="history-dot" style="background-color: ${petData.color || '#34C759'}"></div>
          <div class="history-time">${labels[index] || `P${index}`}</div>
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
  private initializeWebSocketService(): void {
    // Suscribirse al estado de conexión WebSocket
    const connectionSub = this.webSocketService.connectionStatus$.subscribe((isConnected: boolean) => {
      this.isRealtimeConnected = isConnected;
      console.log('🔄 Map: WebSocket connection status updated:', isConnected);
      
      // Si el WebSocket se desconecta, el ESP32 también se considera desconectado
      if (!isConnected) {
        this.isESP32Connected = false;
        if (this.selectedPet && this.selectedPet.name === 'Max') {
          this.petSelectionService.updatePetStatus(this.selectedPet.id, 'offline');
          this.petSelectionService.updatePetActivityState(this.selectedPet.id, 'disconnected');
        }
      }
    });
    this.subscriptions.push(connectionSub);

    // Suscribirse a los datos de la mascota (ESP32C6)
    const dataSub = this.webSocketService.petData$.subscribe((data: PetData | null) => {
      if (data) {
        // Actualizar timestamp de última recepción de datos del ESP32
        this.lastESP32DataTime = Date.now();
        
        // Marcar ESP32 como conectado ya que está enviando datos
        if (!this.isESP32Connected) {
          this.isESP32Connected = true;
          console.log('🟢 ESP32C6 started sending data - marking as connected');
          
          // Mostrar notificación de conexión
          this.notificationService.showConnectionActive('Max');
          
          // Actualizar estado de la mascota Max
          if (this.selectedPet && this.selectedPet.name === 'Max') {
            console.log('📡 Updating Max pet status to online and activity to resting');
            this.petSelectionService.updatePetStatus(this.selectedPet.id, 'online');
            this.petSelectionService.updatePetActivityState(this.selectedPet.id, 'resting');
          }
        }
        
        // Actualizar ubicación directamente desde los datos GPS del ESP32C6
        if (data.gps_valid && data.latitude && data.longitude) {
          this.lastLocationUpdate = {
            petId: data.petId.toString(),
            latitude: data.latitude,      // ✅ Usar latitude directamente
            longitude: data.longitude,    // ✅ Usar longitude directamente
            timestamp: data.timestamp,
            gps_valid: data.gps_valid
          };
          console.log('📍 Ubicación actualizada desde ESP32C6:', this.lastLocationUpdate);
          this.updatePetLocation(this.lastLocationUpdate);
        } else {
          console.log('❌ Sin GPS válido desde ESP32C6, no se actualiza ubicación');
        }
        
        // Actualizar IMU
        this.lastIMUUpdate = {
          petId: data.petId.toString(),
          accelX: data.accelerometer.x,
          accelY: data.accelerometer.y,
          accelZ: data.accelerometer.z,
          gyroX: data.gyroscope.x,
          gyroY: data.gyroscope.y,
          gyroZ: data.gyroscope.z,
          activity: data.activity || 'unknown',
          timestamp: data.timestamp,
          activity_confidence: data.activity_confidence,
          movement_intensity: data.movement_intensity,
          posture: data.posture,
          gps_speed_kmh: data.gps_speed_kmh
        };
        
        // Debug logging detallado
        console.log('\n🔔 ===== DATOS RECIBIDOS EN FRONTEND =====');
        console.log(`🕒 Timestamp: ${new Date().toLocaleTimeString()}`);
        console.log(`🏷️  Device ID: ${data.deviceId}`);
        console.log(`🎭 Actividad recibida: ${data.activity || 'NO DEFINIDA'}`);
        console.log(`📈 Confianza: ${data.activity_confidence ? (data.activity_confidence * 100).toFixed(1) + '%' : 'N/A'}`);
        console.log(`💪 Intensidad: ${data.movement_intensity !== undefined ? data.movement_intensity + '%' : 'N/A'}`);
        console.log(`🧍 Postura: ${data.posture || 'N/A'}`);
        console.log(`📍 GPS válido: ${data.gps_valid ? 'SÍ' : 'NO'}`);
        if (data.gps_valid && data.latitude && data.longitude) {
          console.log(`🌍 Coordenadas: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`);
          console.log(`🏃 Velocidad: ${data.gps_speed_kmh ? data.gps_speed_kmh.toFixed(1) + ' km/h' : 'N/A'}`);
        }
        console.log('=========================================\n');
        
        this.updatePetActivity(this.lastIMUUpdate);
      }
    });
    this.subscriptions.push(dataSub);

    // Suscribirse a los datos de ruta
    const routeSub = this.webSocketService.routeData$.subscribe((routeData: any) => {
      if (routeData) {
        console.log('📍 Datos de ruta recibidos en map component:', routeData);
        this.handleRouteData(routeData);
      }
    });
    this.subscriptions.push(routeSub);

    // Timer para verificar timeout del ESP32C6
    const timeoutCheck = setInterval(() => {
      if (this.isESP32Connected && this.lastESP32DataTime > 0) {
        const timeSinceLastData = Date.now() - this.lastESP32DataTime;
        if (timeSinceLastData > this.esp32TimeoutMs) {
          console.log('🔴 ESP32C6 data timeout - marking as disconnected');
          this.isESP32Connected = false;
          
          // Mostrar notificación de desconexión
          this.notificationService.showConnectionInactive('Max');
          
          // Actualizar estado de la mascota Max
          if (this.selectedPet && this.selectedPet.name === 'Max') {
            this.petSelectionService.updatePetStatus(this.selectedPet.id, 'offline');
            this.petSelectionService.updatePetActivityState(this.selectedPet.id, 'disconnected');
          }
        }
      }
    }, 5000); // Verificar cada 5 segundos

    // Agregar cleanup del timer
    this.subscriptions.push({
      unsubscribe: () => clearInterval(timeoutCheck)
    } as Subscription);
  }

  private updatePetLocation(locationData: any): void {
    console.log('🔍 updatePetLocation llamado con:', locationData);
    
    // Solo actualizar ubicación si es Max (petId: 1) - NO requerir GPS válido cuando ESP32 conectado
    if (this.currentPetData && this.currentPetData.name === 'Max' && locationData.petId === '1') {
      
      // Si ESP32C6 está conectado, usar coordenadas recibidas (incluso sin GPS válido)
      if (this.isESP32Connected && locationData.longitude && locationData.latitude && 
          locationData.longitude !== 0 && locationData.latitude !== 0) {
        const newCoordinates: [number, number] = [locationData.longitude, locationData.latitude];
        console.log('✅ ESP32C6 conectado: actualizando con coordenadas recibidas:', newCoordinates);
        
        this.updatePetMarkerPosition(newCoordinates, false); // NO centrar automáticamente
        
      } else if (locationData.gps_valid && locationData.longitude && locationData.latitude && 
          locationData.longitude !== 0 && locationData.latitude !== 0) {
        const newCoordinates: [number, number] = [locationData.longitude, locationData.latitude];
        console.log('✅ GPS válido: actualizando ubicación de Max:', newCoordinates);
        
        this.updatePetMarkerPosition(newCoordinates, false); // NO centrar automáticamente
        
      } else {
        console.log('❌ ESP32C6 desconectado o coordenadas inválidas - usando ubicación UPC Monterrico');
        // Ubicación fija: UPC Sede Monterrico
        const upcCoordinates: [number, number] = [-76.9717, -12.0635]; 
        this.updatePetMarkerPosition(upcCoordinates, false);
      }
    } else {
      console.log('🚫 updatePetLocation ignorado:', {
        currentPet: this.currentPetData?.name,
        petId: locationData.petId,
        isMax: this.currentPetData?.name === 'Max',
        isCorrectId: locationData.petId === '1'
      });
    }
  }

  // Nueva función separada para actualizar posición del marcador sin centrar
  private updatePetMarkerPosition(coordinates: [number, number], shouldCenter: boolean = false): void {
    // Si el usuario está interactuando con el mapa, NO actualizar nada excepto el marcador
    if (this.isUserInteractingWithMap && !shouldCenter) {
      console.log('🚫 Usuario interactuando - solo actualizar marcador, NO mover mapa');
      
      // Solo actualizar la posición del marcador, no el mapa
      if (this.petMarker) {
        this.petMarker.setLngLat(coordinates);
      }
      
      // Actualizar ubicación almacenada
      this.petLocation = coordinates;
      this.petSelectionService.updatePetLocation(1, coordinates);
      return;
    }
    
    // Verificar si la ubicación ha cambiado significativamente para evitar updates innecesarios
    if (this.petLocation) {
      const distance = this.calculateDistance(this.petLocation, coordinates);
      const distanceMeters = distance * 111000;
      
      // Solo actualizar si hay cambio significativo (más de 5 metros)
      if (distanceMeters < 5) {
        console.log(`📏 Cambio menor a 5m (${distanceMeters.toFixed(1)}m) - no actualizar`);
        return;
      }
      
      console.log(`📏 Distancia desde última ubicación: ${distanceMeters.toFixed(2)} metros`);
    }
    
    // Actualizar ubicación almacenada
    this.petLocation = coordinates;
    
    // Actualizar en el servicio de mascotas
    this.petSelectionService.updatePetLocation(1, coordinates);
    
    // Actualizar marcador en el mapa SIN centrar automáticamente
    if (this.petMarker && this.map) {
      console.log('🗺️ Actualizando marcador en el mapa a:', coordinates);
      this.petMarker.setLngLat(coordinates);
      
      // Solo centrar si se solicita explícitamente (ej: botón "Mi Ubicación")
      if (shouldCenter) {
        console.log('🎯 Centrando mapa por solicitud explícita');
        this.map.flyTo({
          center: coordinates,
          zoom: Math.max(this.map.getZoom(), 16),
          duration: 1000
        });
      } else {
        console.log('✅ Marcador actualizado SIN centrar mapa');
      }
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

  private updatePetActivity(imuData: any): void {
    console.log('\n🔄 ===== ACTUALIZANDO ACTIVIDAD EN MAPA =====');
    console.log(`🎭 Actividad a aplicar: ${imuData.activity}`);
    console.log(`📈 Confianza: ${imuData.activity_confidence ? (imuData.activity_confidence * 100).toFixed(1) + '%' : 'N/A'}`);
    console.log(`💪 Intensidad: ${imuData.movement_intensity !== undefined ? imuData.movement_intensity + '%' : 'N/A'}`);
    
    // Solo actualizar si es la mascota Max (que recibe datos del ESP32)
    if (this.petMarker) {
      const markerElement = this.petMarker.getElement();
      const petName = markerElement.getAttribute('data-pet-name');
      
      console.log(`🏷️  Marcador encontrado para: ${petName}`);
      
      // Solo Max recibe actualizaciones del ESP32
      if (petName === 'Max') {
        // Optimización: solo cambiar si el estado es diferente
        const currentState = markerElement.className.match(/state-(\w+)/)?.[1];
        
        console.log(`🔄 Estado actual del marcador: ${currentState}`);
        console.log(`🎯 Nuevo estado a aplicar: ${imuData.activity}`);
        
        if (currentState !== imuData.activity) {
          // Actualizar clases CSS según el estado con transición suave
          markerElement.classList.remove('state-resting', 'state-walking', 'state-running', 'state-traveling', 'state-lying', 'state-sitting', 'state-standing', 'state-playing', 'state-disconnected');
          markerElement.classList.add(`state-${imuData.activity}`);
          
          console.log(`✅ ESTADO VISUAL ACTUALIZADO: ${currentState} → ${imuData.activity}`);
          
          // Actualizar el estado en el servicio
          if (this.selectedPet && this.selectedPet.name === 'Max') {
            const validActivity = imuData.activity as 'resting' | 'walking' | 'running' | 'traveling' | 'lying' | 'sitting' | 'standing' | 'playing';
            this.petSelectionService.updatePetActivityState(this.selectedPet.id, validActivity);
            console.log(`🔄 Estado en servicio actualizado: ${validActivity}`);
          }
          
          // Trigger a subtle animation for activity change
          this.triggerActivityChangeAnimation(markerElement, imuData.activity);
          
          console.log(`🎨 Animación de cambio activada para: ${imuData.activity}`);
        } else {
          console.log(`⚪ Sin cambios - estado ya es: ${currentState}`);
        }
      } else {
        console.log(`⚠️ Marcador no es Max, ignorando actualización para: ${petName}`);
      }
    } else {
      console.log(`❌ No se encontró marcador de mascota`);
    }
    console.log('==========================================\n');
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

  private updatePetBattery(batteryData: any): void {
    console.log('Actualizando batería de mascota:', batteryData.batteryLevel + '%');
    
    if (this.petMarker) {
      const markerElement = this.petMarker.getElement();
      const statusElement = markerElement.querySelector('.pet-status');
      
      if (statusElement) {
        // Actualizar color del punto de estado según batería
        let bgColor = '#34C759'; // Verde por defecto
        if (batteryData.batteryLevel < 20) {
          bgColor = '#FF3B30'; // Rojo si batería baja
        } else if (batteryData.batteryLevel < 50) {
          bgColor = '#FF9500'; // Naranja si batería media
        }
        
        (statusElement as HTMLElement).style.backgroundColor = bgColor;
        
        // Actualizar clases de estado
        statusElement.classList.remove('status-online', 'status-offline', 'status-low-battery');
        statusElement.classList.add(`status-${batteryData.status}`);
        
        if (batteryData.batteryLevel < 20) {
          statusElement.classList.add('status-low-battery');
        }
      }
    }
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
      case 'resting': return 'fa-bed';
      case 'walking': return 'fa-walking';
      case 'running': return 'fa-running';
      case 'traveling': return 'fa-car';
      case 'disconnected': return 'fa-wifi-slash';
      default: return 'fa-question';
    }
  }

  // Texto descriptivo para cada estado de actividad
  public getActivityText(activityState: string): string {
    if (!activityState) {
      // Si no hay actividad pero hay conexión, mostrar estado basado en conexión
      if (this.isESP32Connected) {
        return 'Conectado';
      } else {
        return 'Desconectado';
      }
    }
    
    switch (activityState.toLowerCase()) {
      case 'resting': return 'Descansando';
      case 'walking': return 'Caminando';
      case 'running': return 'Corriendo';
      case 'traveling': return 'En transporte';
      case 'disconnected': return 'Desconectado';
      case 'connected': return 'Conectado';
      case 'unknown': return this.isESP32Connected ? 'Conectado' : 'Desconectado';
      default: return this.isESP32Connected ? 'Conectado' : 'Estado desconocido';
    }
  }

  // Función para calcular tiempo transcurrido
  public getTimeAgo(timestamp: number | string | Date): string {
    if (!timestamp) return 'Tiempo desconocido';
    
    let date: Date;
    if (typeof timestamp === 'number') {
      // Si el timestamp es muy pequeño (< 1e12), es probablemente millis desde boot del ESP32C6
      // En ese caso, usar el tiempo de la última actualización recibida
      if (timestamp < 1e12) {
        // Para ESP32C6: usar tiempo de última recepción de datos
        if (this.lastESP32DataTime > 0) {
          date = new Date(this.lastESP32DataTime);
        } else {
          return 'Hace unos segundos';
        }
      } else {
        // Timestamp Unix normal
        date = new Date(timestamp);
      }
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      date = timestamp;
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    
    if (diffSeconds < 10) {
      return 'Ahora';
    } else if (diffSeconds < 60) {
      return 'Hace unos segundos';
    } else if (diffMinutes < 60) {
      return `Hace ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours}h`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `Hace ${diffDays}d`;
    }
  }

  // Función específica para el tiempo en el popup
  public getLastUpdateTimeText(): string {
    if (this.isESP32Connected && this.lastESP32DataTime > 0) {
      return this.getTimeAgo(this.lastESP32DataTime);
    } else if (this.selectedPet?.name === 'Max') {
      return 'Sin conexión';
    } else {
      return 'Hace 5 min'; // Para mascotas demo
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

  // Método para obtener información del estado de la mascota (solo actividad, no conexión)
  public getPetStatusInfo(pet: any): { class: string, icon: string, text: string } {
    // Para Max: usar estado dinámico del ESP32C6 - solo actividad
    if (pet.name === 'Max') {
      // Debug logging para diagnosticar el problema
      console.log('🔍 Debug getPetStatusInfo para Max:', {
        isESP32Connected: this.isESP32Connected,
        lastIMUUpdate: this.lastIMUUpdate,
        activity: this.lastIMUUpdate?.activity,
        activityType: typeof this.lastIMUUpdate?.activity,
        timeSinceLastData: this.lastESP32DataTime ? Date.now() - this.lastESP32DataTime : 'never'
      });
      
      // Verificar si tenemos datos recientes del ESP32C6 (último minuto)
      const hasRecentData = this.lastESP32DataTime && (Date.now() - this.lastESP32DataTime) < 60000;
      
      if (this.isESP32Connected && this.lastIMUUpdate?.activity && hasRecentData) {
        // Usar actividad real del ESP32C6
        const activity = this.lastIMUUpdate.activity.toLowerCase().trim();
        console.log('🎯 Actividad procesada:', activity);
        
        switch (activity) {
          case 'resting':
            return {
              class: 'status-resting',
              icon: '🛌',
              text: 'Descansando'
            };
          case 'walking':
            return {
              class: 'status-walking',
              icon: '🚶‍♂️',
              text: 'Caminando'
            };
          case 'running':
            return {
              class: 'status-running',
              icon: '🏃‍♂️',
              text: 'Corriendo'
            };
          case 'traveling':
            return {
              class: 'status-traveling',
              icon: '🚗',
              text: 'En transporte'
            };
          default:
            console.log('⚠️ Actividad no reconocida:', activity);
            return {
              class: 'status-unknown',
              icon: '❓',
              text: 'Actividad desconocida'
            };
        }
      } else {
        // Sin datos del ESP32C6 - mostrar estado desconocido
        console.log('❌ ESP32C6 no conectado o sin datos IMU');
        return {
          class: 'status-unknown',
          icon: '❓',
          text: 'Sin datos de actividad'
        };
      }
    }
    
    // Para mascotas demo: usar estados fijos según el activityState
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
      case 'walking':
        return {
          class: 'status-walking',
          icon: '🚶‍♂️',
          text: 'Caminando'
        };
      case 'running':
        return {
          class: 'status-running',
          icon: '🏃‍♂️',
          text: 'Corriendo'
        };
      case 'disconnected':
        // Para mascotas desconectadas, mostrar su último estado conocido de actividad
        // En lugar de mostrar "Desconectado", mostrar "Parado" como estado por defecto
        return {
          class: 'status-standing',
          icon: '🚶',
          text: 'Parado'
        };
      default:
        return {
          class: 'status-standing',
          icon: '🚶',
          text: 'De pie'
        };
    }
  }

  // Método para obtener el estado de conexión (diferente del estado de actividad)
  public getConnectionStatus(pet: any): { isConnected: boolean, status: string } {
    if (pet.name === 'Max') {
      // Para Max: depende de si el ESP32C6 está enviando datos reales
      return {
        isConnected: this.isESP32Connected,
        status: this.isESP32Connected ? 'En vivo' : 'Desconectado'
      };
    } else {
      // Para mascotas demo: usar la propiedad status (online/offline)
      const isConnected = pet.status === 'online';
      return {
        isConnected: isConnected,
        status: isConnected ? 'Demo' : 'Desconectado'
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

  // Función para convertir postura a texto legible
  public getPostureText(posture: string): string {
    const postureMap: { [key: string]: string } = {
      'upright': 'Erguido',
      'upside_down': 'Boca abajo',
      'forward_lean': 'Inclinado adelante',
      'backward_lean': 'Inclinado atrás',
      'right_lean': 'Inclinado derecha',
      'left_lean': 'Inclinado izquierda',
      'tilted': 'Inclinado'
    };
    
    return postureMap[posture] || 'Desconocida';
  }

  // Actualiza el marcador de la mascota en el mapa (solo para Max con datos del ESP32)
  public updatePetMarker(data: [number, number] | any): void {
    // Solo actualizar ubicación si es Max y los datos vienen del ESP32
    if (this.currentPetData && this.currentPetData.name === 'Max') {
      let coords: [number, number] | undefined;
      
      if (Array.isArray(data) && data.length === 2 && typeof data[0] === 'number' && typeof data[1] === 'number') {
        coords = [data[0], data[1]];
      } else if (data && Array.isArray(data.coordinates) && data.coordinates.length === 2) {
        coords = [data.coordinates[0], data.coordinates[1]];
      } else {
        return;
      }
      
      if (this.petMarker && this.map && coords) {
        this.petLocation = coords;
        this.petMarker.setLngLat(coords);
        
        // Removido centrado automático - el usuario debe usar el botón "Centrar en mascota"
        // Esto evita que el mapa se centre automáticamente cuando se reciben actualizaciones
      }
    }
  }

  // Función para obtener nombre del lugar estilo Apple (sin coordenadas)
  public getLocationName(): string {
    if (!this.isESP32Connected) {
      return 'UPC Sede Monterrico, Lima';
    }
    
    // Cuando está conectado, mostrar área general sin coordenadas específicas
    if (this.petLocation) {
      const [lng, lat] = this.petLocation;
      
      // Detectar área general de Lima basada en coordenadas
      if (lat > -12.2 && lat < -11.8 && lng > -77.2 && lng < -76.8) {
        if (lat > -12.1 && lng < -77.0) {
          return 'Miraflores, Lima';
        } else if (lat > -12.15 && lng < -76.98) {
          return 'San Isidro, Lima';
        } else if (lat > -12.08 && lng < -76.97) {
          return 'Surco, Lima';
        } else if (lat > -12.18 && lng < -77.03) {
          return 'Barranco, Lima';
        } else {
          return 'Lima, Perú';
        }
      }
      
      return 'Ubicación desconocida';
    }
    
    return 'Sin ubicación';
  }

  // ============================================================================
  // MANEJO INTELIGENTE DE INTERACCIÓN DEL USUARIO
  // ============================================================================

  private setupUserInteractionListeners(): void {
    // Detectar cuando el usuario interactúa con el mapa
    const userInteractionEvents = ['mousedown', 'touchstart', 'wheel', 'dragstart'];
    
    userInteractionEvents.forEach(event => {
      this.map.on(event, () => {
        this.isUserInteractingWithMap = true;
        this.lastUserInteraction = Date.now();
        console.log('🖱️ Usuario interactuando con el mapa - deshabilitando auto-centrado');
      });
    });

    // Resetear la interacción después de un tiempo sin actividad
    setInterval(() => {
      if (this.isUserInteractingWithMap && 
          Date.now() - this.lastUserInteraction > this.userInteractionTimeout) {
        this.isUserInteractingWithMap = false;
        console.log('⏰ Tiempo de inactividad completado - habilitando auto-updates');
      }
    }, 1000);
  }

  // ============================================================================
  // MANEJO DE RUTAS Y TRAYECTORIAS
  // ============================================================================

  private handleRouteData(routeData: any): void {
    console.log('📍 Recibiendo datos de ruta:', routeData);
    
    if (!routeData.route || !Array.isArray(routeData.route)) {
      console.log('❌ Datos de ruta inválidos');
      return;
    }

    const route = {
      id: `route_${Date.now()}`,
      points: routeData.route,
      startTime: routeData.route[0]?.timestamp || Date.now(),
      endTime: routeData.route[routeData.route.length - 1]?.timestamp || Date.now(),
      totalDistance: this.calculateRouteDistance(routeData.route)
    };

    // Agregar a historial
    this.routeHistory.push(route);
    console.log(`💾 Ruta guardada en historial: ${route.totalDistance.toFixed(2)}m`);

    // Mostrar ruta en el mapa si no hay interacción del usuario
    if (!this.isUserInteractingWithMap) {
      this.displayActiveRoute(route);
    }

    // Limpiar rutas antiguas (mantener solo las últimas 10)
    if (this.routeHistory.length > 10) {
      this.routeHistory = this.routeHistory.slice(-10);
    }
  }

  private calculateRouteDistance(points: any[]): number {
    let totalDistance = 0;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      
      const distance = this.calculateDistance([prev.lng, prev.lat], [curr.lng, curr.lat]);
      totalDistance += distance * 111000; // Convertir a metros
    }
    
    return totalDistance;
  }

  private displayActiveRoute(route: any): void {
    // Remover ruta anterior si existe
    if (this.activeRouteLayer && this.map.getLayer(this.activeRouteLayer)) {
      this.map.removeLayer(this.activeRouteLayer);
      this.map.removeSource(this.activeRouteLayer);
    }

    // Preparar coordenadas para la polilínea
    const coordinates = route.points.map((point: any) => [point.lng, point.lat]);
    
    const routeId = `active-route-${Date.now()}`;
    this.activeRouteLayer = routeId;

    // Agregar fuente de datos
    this.map.addSource(routeId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      }
    });

    // Agregar capa de línea
    this.map.addLayer({
      id: routeId,
      type: 'line',
      source: routeId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3887be',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });

    console.log(`🗺️ Ruta mostrada en el mapa: ${route.points.length} puntos`);
  }

  public getRouteHistory(): any[] {
    return this.routeHistory;
  }

  public showRouteOnMap(routeId: string): void {
    const route = this.routeHistory.find(r => r.id === routeId);
    if (route) {
      this.displayActiveRoute(route);
      
      // Centrar el mapa en la ruta
      const coordinates = route.points.map((point: any) => [point.lng, point.lat]);
      if (coordinates.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend(coord as [number, number]));
        this.map.fitBounds(bounds, { padding: 20 });
      }
    }
  }
}
