import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  template: `
    <router-outlet></router-outlet>
  `,
  styleUrl: './app.scss',
  standalone: true,
  imports: [CommonModule, RouterOutlet]
})
export class AppComponent {
  title = 'pet-tracker';
}
