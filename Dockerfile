# Use Node.js 24 para compatibilidad con Angular 20
FROM node:24-alpine

WORKDIR /app

# Copiar package.json y instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar todo el código
COPY . .

# Build del proyecto
RUN npm run build

# Instalar serve globalmente para servir archivos estáticos
RUN npm install -g serve

# Exponer puerto
EXPOSE 3000

# Comando de inicio con configuración SPA para Angular (evita error 404)
CMD ["serve", "-s", "frontend/dist/pet-tracker/browser", "-l", "3000", "--single"]