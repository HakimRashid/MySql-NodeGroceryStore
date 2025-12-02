FROM node:22-alpine

WORKDIR /app

COPY www/package*.json ./

RUN npm install

CMD ["npm", "run", "start"]