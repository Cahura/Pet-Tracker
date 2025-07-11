# 🐾 Avatares Personalizados de Mascotas - PetTracker

## 📁 Ubicación de Avatares
Los avatares de mascotas se encuentran en: `src/assets/pet-avatars/`

## 🎨 Avatares Disponibles

### Perros 🐕
- `dog.png` - Avatar original (estilo que compartiste)
- `dog-custom.svg` - Perro estilo flat design con lengua rosada
- `dog-2.png` - Copia del avatar original

### Gatos 🐱
- `cat.png` - Copia del avatar original (temporalmente usando imagen de perro)
- `cat-custom.svg` - Gato estilo flat design con bigotes y orejas puntiagudas
- `cat-2.png` - Copia del avatar original

## 🔧 Configuración en el Código

### Servicio de Mascotas
En `src/app/services/pet-selection.service.ts`:
```typescript
private demoAnimals: PetData[] = [
  { 
    id: 1, 
    name: 'Max', 
    type: 'dog',
    avatar: 'assets/pet-avatars/dog.png'  // Tu imagen original
  },
  { 
    id: 2, 
    name: 'Luna', 
    type: 'cat',
    avatar: 'assets/pet-avatars/cat-custom.svg'  // Gato SVG personalizado
  },
  // ... más mascotas
];
```

### Marcador en el Mapa
En `src/app/map/map-simple.ts`:
- Los avatares se cargan automáticamente según el tipo de mascota
- Si falla cargar la imagen, se muestra un icono FontAwesome como fallback
- Los colores del anillo cambian según el tipo:
  - **Perros**: Verde (#34C759)
  - **Gatos**: Naranja (#FF6B35)

## 🎯 Cómo Añadir Nuevos Avatares

1. **Agregar imagen**: Coloca tu archivo (PNG, SVG, JPG) en `src/assets/pet-avatars/`
2. **Actualizar servicio**: Modifica el array `demoAnimals` en `pet-selection.service.ts`
3. **Recompilar**: Ejecuta `ng build` para incluir los nuevos assets

### Formato Recomendado
- **Tamaño**: 150x150 píxeles
- **Formato**: SVG (escalable) o PNG (alta calidad)
- **Estilo**: Flat design con fondo circular
- **Colores**: Vibrantes y amigables

## 🎨 Creando Avatares SVG Personalizados

Puedes crear avatares SVG siguiendo este patrón:
```svg
<svg width="150" height="150" viewBox="0 0 150 150">
  <!-- Fondo circular -->
  <circle cx="75" cy="75" r="75" fill="#COLOR_FONDO"/>
  
  <!-- Cara de la mascota -->
  <ellipse cx="75" cy="85" rx="35" ry="30" fill="#COLOR_CARA"/>
  
  <!-- Ojos, nariz, boca, etc. -->
  <!-- ... más elementos ... -->
</svg>
```

## 🔄 Próximos Pasos

Para mejorar aún más los avatares:
1. **Reemplazar temporales**: Las imágenes `cat.png` y `cat-2.png` necesitan avatares únicos de gatos
2. **Más variedad**: Añadir diferentes razas y colores
3. **Animaciones**: Agregar micro-animaciones a los avatares SVG
4. **Personalización**: Permitir a los usuarios subir sus propios avatares

## 🎮 Prueba en la Aplicación

1. Ve a la pantalla de login
2. Selecciona diferentes mascotas (Max, Luna, Charlie, Bella)
3. Observa cómo cambian los avatares en el mapa
4. Usa el botón "Centrar en la mascota" para ver la animación de resaltado

¡Los avatares ahora tienen el estilo flat design que solicitaste! 🎉
