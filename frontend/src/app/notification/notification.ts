import { Component, OnInit, OnDestroy, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'pet-alert';
  timestamp: Date;
  duration?: number;
  autoDismiss?: boolean;
  isEntering?: boolean;
  isExiting?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<NotificationData[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Verificar si ya se mostraron las notificaciones de bienvenida
  private hasShownWelcomeNotifications(): boolean {
    return localStorage.getItem('pet-tracker-welcome-shown') === 'true';
  }

  // Marcar que ya se mostraron las notificaciones de bienvenida
  private markWelcomeNotificationsShown(): void {
    localStorage.setItem('pet-tracker-welcome-shown', 'true');
  }

  public showNotification(notification: Omit<NotificationData, 'id' | 'timestamp'>): void {
    // En producción, solo suprimir notificaciones de info básicas, permitir success para conexiones
    const suppressedTypes = ['info'];
    if (suppressedTypes.includes(notification.type) && !notification.title.includes('Conectado') && !notification.title.includes('Activo')) {
      console.log('Notification suppressed for production:', notification.title);
      return;
    }

    const newNotification: NotificationData = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      duration: notification.duration || 5000,
      autoDismiss: notification.autoDismiss !== false,
      isEntering: true
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([newNotification, ...currentNotifications]);

    // Auto dismiss
    if (newNotification.autoDismiss) {
      setTimeout(() => {
        this.dismissNotification(newNotification.id);
      }, newNotification.duration);
    }
  }

  // Mostrar notificaciones de bienvenida solo una vez
  public showWelcomeNotifications(petName: string): void {
    if (this.hasShownWelcomeNotifications()) {
      console.log('Welcome notifications already shown, skipping...');
      return;
    }

    this.showSuccess(
      '¡Bienvenido!', 
      `Rastreando a ${petName} en tiempo real`
    );
    
    setTimeout(() => {
      this.showInfo(
        'Consejos',
        'Toca sobre el avatar de tu mascota para ver más información'
      );
    }, 2000);

    setTimeout(() => {
      this.showInfo(
        'Funciones',
        'Usa los botones de acción para ver historial, alertas y configurar zonas seguras'
      );
    }, 4000);

    // Marcar como mostradas
    this.markWelcomeNotificationsShown();
  }

  public dismissNotification(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const notification = currentNotifications.find(n => n.id === id);
    
    if (notification) {
      // Set exiting animation
      notification.isExiting = true;
      this.notificationsSubject.next([...currentNotifications]);
      
      // Remove after animation
      setTimeout(() => {
        const updatedNotifications = this.notificationsSubject.value.filter(n => n.id !== id);
        this.notificationsSubject.next(updatedNotifications);
      }, 300);
    }
  }

  public clearAllNotifications(): void {
    this.notificationsSubject.next([]);
  }

  // Métodos específicos para diferentes tipos de notificaciones
  public showPetAlert(petName: string, message: string): void {
    this.showNotification({
      title: `Alerta de ${petName}`,
      message,
      type: 'pet-alert',
      duration: 8000
    });
  }

  // Métodos específicos para el estado de conexión del ESP32C6
  public showConnectionActive(petName: string): void {
    this.showNotification({
      title: `${petName} - Sistema Activo`,
      message: 'ESP32C6 conectado y enviando datos en tiempo real',
      type: 'success',
      duration: 5000
    });
  }

  public showConnectionInactive(petName: string): void {
    this.showNotification({
      title: `${petName} - Dispositivo Desconectado`,
      message: 'No se reciben datos del dispositivo de seguimiento',
      type: 'warning',
      duration: 7000
    });
  }

  public showConnectionRestored(petName: string): void {
    this.showNotification({
      title: `${petName} - Dispositivo Conectado`,
      message: 'Dispositivo reconectado - Datos en tiempo real disponibles',
      type: 'success',
      duration: 5000
    });
  }

  public showSuccess(title: string, message: string): void {
    this.showNotification({
      title,
      message,
      type: 'success'
    });
  }

  public showError(title: string, message: string): void {
    this.showNotification({
      title,
      message,
      type: 'error',
      duration: 7000
    });
  }

  public showInfo(title: string, message: string): void {
    this.showNotification({
      title,
      message,
      type: 'info'
    });
  }
}

@Component({
  selector: 'app-notification',
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrl: './notification.scss'
})
export class Notification implements OnInit, OnDestroy {
  public notifications: NotificationData[] = [];
  private destroy$ = new Subject<void>();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public trackByNotificationId(index: number, notification: NotificationData): string {
    return notification.id;
  }

  public getNotificationIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      case 'pet-alert': return '🐕';
      default: return 'ℹ️';
    }
  }

  public getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Ahora';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Hace ${minutes}m`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Hace ${hours}h`;
    }
  }

  public dismissNotification(id: string): void {
    this.notificationService.dismissNotification(id);
  }
}
