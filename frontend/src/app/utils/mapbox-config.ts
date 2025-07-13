// Mapbox configuration utility
import mapboxgl from 'mapbox-gl';
import { environment } from '../../environments/environment';

/**
 * Inicializa Mapbox con el token seguro desde environment.
 * No expongas el token directamente en producción.
 */
export function initializeMapbox() {
  // Usa el token desde environment
  const token = environment.mapboxToken;

  try {
    mapboxgl.accessToken = token;
    if (!mapboxgl.accessToken) {
      throw new Error('Access token not set properly');
    }
    // Solo para desarrollo: log de éxito
    if (!environment.production) {
      console.log('Mapbox access token configurado correctamente');
    }
  } catch (error) {
    console.error('Error configurando Mapbox access token:', error);
    (mapboxgl as any).accessToken = token;
  }
}

export { mapboxgl };
