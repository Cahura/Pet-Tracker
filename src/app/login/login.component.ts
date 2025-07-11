import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PetSelectionService } from '../services/pet-selection.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <!-- Background with pet-themed gradient -->
      <div class="login-background"></div>
      
      <!-- Main login card -->
      <div class="login-card liquid-glass-strong animate-fade-in">
        <!-- Logo and title -->
        <div class="login-header">
          <div class="logo-container">
            <div class="logo-icon">
              <i class="fas fa-paw"></i>
            </div>
            <h1 class="app-title">PetTracker</h1>
          </div>
          <p class="login-subtitle">Mantén a tu mascota siempre cerca</p>
        </div>
        
        <!-- Login form -->
        <div class="login-form">
          <div class="input-group">
            <div class="input-container liquid-glass-subtle">
              <i class="fas fa-envelope input-icon"></i>
              <input 
                type="email" 
                [(ngModel)]="email" 
                placeholder="Correo electrónico"
                class="login-input"
                [class.error]="hasError && !email"
                (focus)="clearError()"
                (keyup.enter)="handleLogin()"
              >
            </div>
          </div>
          
          <div class="input-group">
            <div class="input-container liquid-glass-subtle">
              <i class="fas fa-lock input-icon"></i>
              <input 
                type="password" 
                [(ngModel)]="password" 
                placeholder="Contraseña"
                class="login-input"
                [class.error]="hasError && !password"
                (focus)="clearError()"
                (keyup.enter)="handleLogin()"
              >
            </div>
          </div>
          
          <!-- Error message -->
          <div class="error-message" *ngIf="hasError">
            <i class="fas fa-exclamation-triangle"></i>
            <span>{{ errorMessage }}</span>
          </div>
          
          <!-- Login button -->
          <button 
            class="login-btn liquid-glass-accent"
            (click)="handleLogin()"
            [disabled]="isLoading"
          >
            <i class="fas fa-paw" *ngIf="!isLoading"></i>
            <i class="fas fa-spinner fa-spin" *ngIf="isLoading"></i>
            <span>{{ isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}</span>
          </button>
          
          <!-- Alternative actions -->
          <div class="login-actions">
            <button class="action-link" (click)="handleForgotPassword()">
              ¿Olvidaste tu contraseña?
            </button>
            <button class="action-link" (click)="handleCreateAccount()">
              Crear cuenta nueva
            </button>
          </div>
        </div>
        
        <!-- Demo pets section -->
        <div class="demo-pets">
          <p class="demo-title">Mascotas de demostración</p>
          <div class="demo-pet-grid">
            <div class="demo-pet liquid-glass-subtle" 
                 *ngFor="let pet of demoPets" 
                 (click)="selectDemoPet(pet)">
              <div class="demo-pet-avatar" [style.background]="pet.gradient">
                <i [class]="pet.icon" [style.color]="'white'"></i>
              </div>
              <span class="demo-pet-name">{{ pet.name }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="login-footer">
        <p>&copy; 2025 PetTracker. Diseñado para el amor hacia las mascotas.</p>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    
    .login-background {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, 
        #1a1a1a 0%,
        #2d1f3d 25%,
        #1a4d2e 50%,
        #2d2d2d 75%,
        #1a1a1a 100%
      );
      z-index: -1;
      animation: gradientShift 20s ease-in-out infinite;
    }
    
    @keyframes gradientShift {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }
    
    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 40px 32px;
      border-radius: 24px;
      margin: 20px 0;
      position: relative;
      z-index: 1;
    }
    
    .login-header {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .logo-container {
      margin-bottom: 16px;
    }
    
    .logo-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    
    .logo-icon i {
      font-size: 32px;
      color: white;
    }
    
    .app-title {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }
    
    .login-subtitle {
      color: var(--text-secondary);
      font-size: 14px;
      margin: 0;
    }
    
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .input-container {
      position: relative;
      display: flex;
      align-items: center;
      padding: 16px;
      border-radius: 12px;
      transition: all var(--transition-normal);
    }
    
    .input-container:focus-within {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
    }
    
    .input-icon {
      color: var(--text-secondary);
      margin-right: 12px;
      font-size: 16px;
    }
    
    .login-input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: 16px;
      outline: none;
      
      &::placeholder {
        color: var(--text-tertiary);
      }
      
      &.error {
        color: var(--error-color);
      }
    }
    
    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--error-color);
      font-size: 14px;
      margin-top: -8px;
    }
    
    .login-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 16px 24px;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      color: white;
      cursor: pointer;
      transition: all var(--transition-normal);
      margin-top: 8px;
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      &:not(:disabled):hover {
        transform: translateY(-2px);
      }
    }
    
    .login-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }
    
    .action-link {
      background: none;
      border: none;
      color: var(--text-accent);
      font-size: 14px;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: all var(--transition-fast);
      
      &:hover {
        background: var(--glass-secondary);
        color: var(--primary-color);
      }
    }
    
    .demo-pets {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .demo-title {
      color: var(--text-secondary);
      font-size: 14px;
      text-align: center;
      margin-bottom: 16px;
    }
    
    .demo-pet-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 12px;
    }
    
    .demo-pet {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 12px;
      border-radius: 12px;
      cursor: pointer;
      transition: all var(--transition-normal);
      
      &:hover {
        transform: translateY(-4px);
      }
    }
    
    .demo-pet-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
      overflow: hidden;
      border: 3px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0));
        border-radius: 50%;
        z-index: 1;
      }
      
      i {
        font-size: 28px;
        z-index: 2;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        transition: all 0.3s ease;
      }
      
      &:hover {
        transform: scale(1.1);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
        border-color: rgba(255, 255, 255, 0.4);
        
        i {
          transform: scale(1.1);
        }
      }
    }
    
    .demo-pet-name {
      color: var(--text-primary);
      font-size: 12px;
      font-weight: 500;
    }
    
    .login-footer {
      margin-top: 32px;
      text-align: center;
      color: var(--text-tertiary);
      font-size: 12px;
    }
    
    @media (max-width: 768px) {
      .login-card {
        padding: 32px 24px;
        margin: 10px 0;
      }
      
      .logo-icon {
        width: 64px;
        height: 64px;
      }
      
      .logo-icon i {
        font-size: 24px;
      }
      
      .app-title {
        font-size: 24px;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  
  demoPets = [
    { name: 'Max', icon: 'fas fa-dog', color: '#FF6B35', gradient: 'linear-gradient(135deg, #FF6B35, #F7931E)' },
    { name: 'Luna', icon: 'fas fa-cat', color: '#9B59B6', gradient: 'linear-gradient(135deg, #9B59B6, #8E44AD)' },
    { name: 'Charlie', icon: 'fas fa-dog', color: '#3498DB', gradient: 'linear-gradient(135deg, #3498DB, #2980B9)' },
    { name: 'Bella', icon: 'fas fa-cat', color: '#E74C3C', gradient: 'linear-gradient(135deg, #E74C3C, #C0392B)' }
  ];

  constructor(
    private router: Router, 
    private petSelectionService: PetSelectionService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Add animation class after component loads
    setTimeout(() => {
      document.body.classList.add('login-loaded');
    }, 100);
  }

  async handleLogin() {
    if (!this.email || !this.password) {
      this.hasError = true;
      this.errorMessage = 'Por favor, completa todos los campos';
      return;
    }

    this.isLoading = true;
    this.hasError = false;

    try {
      // Usar el servicio de autenticación
      const success = await this.authService.login(this.email, this.password);
      
      if (success) {
        this.isLoading = false;
        // Navigate to main app
        this.router.navigate(['/map']);
      } else {
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = 'Credenciales incorrectas';
      }
    } catch (error) {
      this.isLoading = false;
      this.hasError = true;
      this.errorMessage = 'Error al iniciar sesión. Inténtalo de nuevo.';
      console.error('Login error:', error);
    }
  }

  handleForgotPassword() {
    // Handle forgot password logic
    console.log('Forgot password clicked');
  }

  handleCreateAccount() {
    // Handle create account logic
    console.log('Create account clicked');
  }

  selectDemoPet(pet: any) {
    console.log('Demo pet selected:', pet.name);
    
    // Seleccionar la mascota en el servicio
    this.petSelectionService.selectPet(pet.name);
    
    // Demo login with selected pet
    this.email = `demo@pettracker.com`;
    this.password = 'demo123';
    this.handleLogin();
  }

  clearError() {
    this.hasError = false;
    this.errorMessage = '';
  }
}
