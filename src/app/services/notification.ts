import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor() { }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  public show(notification: Omit<Notification, 'id'>): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      duration: notification.duration || 5000
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, newNotification]);

    // Auto-remove notification after duration
    if (!notification.persistent) {
      setTimeout(() => {
        this.remove(newNotification.id);
      }, newNotification.duration);
    }
  }

  public remove(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this.notificationsSubject.next(filteredNotifications);
  }

  public clear(): void {
    this.notificationsSubject.next([]);
  }

  // Métodos de conveniencia
  public success(title: string, message: string, duration?: number): void {
    this.show({ type: 'success', title, message, duration });
  }

  public error(title: string, message: string, persistent?: boolean): void {
    this.show({ type: 'error', title, message, persistent });
  }

  public warning(title: string, message: string, duration?: number): void {
    this.show({ type: 'warning', title, message, duration });
  }

  public info(title: string, message: string, duration?: number): void {
    this.show({ type: 'info', title, message, duration });
  }
}
