FROM node:20-alpine

WORKDIR /app

COPY apps/api-gateway/package*.json ./
RUN npm ci

COPY apps/api-gateway/ ./

RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
