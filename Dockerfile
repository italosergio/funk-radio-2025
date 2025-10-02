FROM node:18-alpine

WORKDIR /app

# Copiar package.json do frontend
COPY package*.json ./
RUN npm install

# Copiar package.json do servidor
COPY server/package*.json ./server/
RUN cd server && npm install

# Copiar código
COPY . .

# Build do frontend
RUN npm run build

EXPOSE 3001

CMD ["cd", "server", "&&", "npm", "start"]