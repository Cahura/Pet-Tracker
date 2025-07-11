import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private router: Router) {
    // Verificar si hay una sesión guardada al inicializar
    this.checkStoredSession();
  }

  private checkStoredSession(): void {
    const storedUser = localStorage.getItem('petTrackerUser');
    const storedToken = localStorage.getItem('petTrackerToken');
    
    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(true);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.clearSession();
      }
    }
  }

  login(email: string, password: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Simular autenticación (en producción sería una llamada al API)
      setTimeout(() => {
        if (email && password) {
          const user: User = {
            id: '1',
            email: email,
            name: email.split('@')[0] || 'Usuario',
            avatar: 'https://via.placeholder.com/150'
          };

          // Guardar en localStorage
          localStorage.setItem('petTrackerUser', JSON.stringify(user));
          localStorage.setItem('petTrackerToken', 'demo-token-' + Date.now());
          
          // Actualizar observables
          this.currentUserSubject.next(user);
          this.isLoggedInSubject.next(true);
          
          resolve(true);
        } else {
          resolve(false);
        }
      }, 1000); // Simular delay de red
    });
  }

  logout(): Promise<void> {
    return new Promise((resolve) => {
      // Limpiar almacenamiento
      this.clearSession();
      
      // Actualizar observables
      this.currentUserSubject.next(null);
      this.isLoggedInSubject.next(false);
      
      // Redirigir al login
      this.router.navigate(['/login']).then(() => {
        resolve();
      });
    });
  }

  private clearSession(): void {
    localStorage.removeItem('petTrackerUser');
    localStorage.removeItem('petTrackerToken');
    localStorage.removeItem('userSession');
    sessionStorage.clear();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('petTrackerToken');
  }
}
