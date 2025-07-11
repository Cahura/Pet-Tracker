import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

// Import required styles
import 'mapbox-gl/dist/mapbox-gl.css';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
