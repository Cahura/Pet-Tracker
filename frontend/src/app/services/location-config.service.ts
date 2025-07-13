import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocationConfigService {
  
  // Configuración de ubicaciones
  private locationConfig = {
    // Luna - Coordenadas genéricas para repo vs reales locales
    luna: {
      // Coordenadas genéricas que se suben al repositorio
      public: [-76.9568, -12.0631] as [number, number],
      
      // Coordenadas reales (solo para desarrollo local)
      // Estas se cargan desde .env.local si existe
      private: this.getPrivateCoordinates() as [number, number]
    }
  };

  constructor() {}

  /**
   * Obtiene las coordenadas de Luna
   * Usa coordenadas privadas si están disponibles, sino las públicas
   */
  getLunaCoordinates(): [number, number] {
    // En desarrollo local, si hay archivo .env.local, usar coordenadas privadas
    if (this.isLocalDevelopment() && this.locationConfig.luna.private) {
      return this.locationConfig.luna.private;
    }
    
    // En producción o sin .env.local, usar coordenadas públicas
    return this.locationConfig.luna.public;
  }

  /**
   * Obtiene las rutas de historial para Luna
   */
  getLunaHistoryRoute(): [number, number][] {
    const baseCoords = this.getLunaCoordinates();
    const [baseLng, baseLat] = baseCoords;
    
    // Generar ruta realista alrededor de la ubicación base
    return [
      [baseLng, baseLat], // Inicio: Casa
      [baseLng - 0.0001, baseLat + 0.0001], // Calle residencial
      [baseLng - 0.0002, baseLat + 0.0003], // Hacia avenida
      [baseLng - 0.0003, baseLat + 0.0004], // Por avenida principal
      [baseLng - 0.0004, baseLat + 0.0006], // Continuando
      [baseLng - 0.0005, baseLat + 0.0007], // Hacia parque
      [baseLng - 0.0006, baseLat + 0.0009], // En área verde
      [baseLng - 0.0007, baseLat + 0.0010], // Centro del parque
      [baseLng - 0.0006, baseLat + 0.0009], // Regresando
      [baseLng - 0.0004, baseLat + 0.0008], // De vuelta por avenida
      [baseLng - 0.0003, baseLat + 0.0006], // Avenida principal
      [baseLng - 0.0001, baseLat + 0.0004], // Girando a casa
      [baseLng, baseLat + 0.0002], // Calle de regreso
      [baseLng, baseLat]  // De vuelta a casa
    ];
  }

  /**
   * Verifica si está en desarrollo local
   */
  private isLocalDevelopment(): boolean {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
  }

  /**
   * Intenta cargar coordenadas privadas desde configuración local
   */
  private getPrivateCoordinates(): [number, number] | null {
    // En una implementación real, esto cargaría desde un archivo de configuración local
    // Por ahora, retornamos null para usar las públicas
    
    // Si existiera un sistema de configuración local, aquí estarían las coordenadas reales:
    // return [-76.95685885511723, -12.063091862113344];
    
    return null;
  }

  /**
   * Obtiene ubicación formateada para mostrar
   */
  getLocationDisplay(petId: number): string {
    switch(petId) {
      case 2: // Luna
        return 'Santa Isabel, Lima';
      default:
        return 'Lima, Perú';
    }
  }
}
