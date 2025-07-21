# Frontend-only build para Pet Tracker
FROM node:20-alpine AS frontend-build

# Build del frontend Angular
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./
RUN npm run build:prod

# Stage de producción con servidor estático
FROM nginx:alpine AS production

# Copiar los archivos built del frontend
COPY --from=frontend-build /app/frontend/dist/pet-tracker/browser /usr/share/nginx/html

# Configurar nginx para SPA (Single Page Application)
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        return 200 "OK"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Verificar que los archivos se copiaron correctamente
RUN ls -la /usr/share/nginx/html/ && \
    echo "✅ Archivos frontend copiados correctamente"

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nginxuser
RUN adduser -S nginxuser -u 1001

# Exponer puerto 80 (nginx default)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]
