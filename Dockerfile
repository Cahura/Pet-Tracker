# Multi-stage build para Pet Tracker
FROM node:18-alpine AS frontend-build

# Build del frontend Angular
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production --silent

COPY frontend/ ./
RUN npm run build

# Stage para el backend
FROM node:18-alpine AS backend

WORKDIR /app

# Instalar dependencias del backend
COPY backend/package*.json ./
RUN npm ci --only=production --silent

# Copiar código del backend
COPY backend/ ./

# Copiar los archivos built del frontend
COPY --from=frontend-build /app/frontend/dist ./public

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Cambiar ownership de archivos
RUN chown -R nodejs:nodejs /app
USER nodejs

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Comando de inicio
CMD ["node", "server.js"]
