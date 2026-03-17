FROM node:18-alpine

WORKDIR /app

# Copy package files first (layer caching)
COPY package*.json ./

RUN npm install --production

# Copy rest of source
COPY . .

# Create logs directory
RUN mkdir -p logs

EXPOSE 5000

CMD ["node", "server.js"]