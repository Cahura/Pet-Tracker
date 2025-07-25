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

# Exponer puerto para Railway
EXPOSE 3000

# Comando de inicio - servidor Node.js con WebSocket
CMD ["npm", "start"]