FROM node:24.7.0-alpine3.21

ENV NODE_ENV=production

WORKDIR /app

# Install native build tools for C++ addons (better-sqlite3, bcrypt)
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci --omit=dev && npm install -g pm2


COPY . .

EXPOSE 3000

CMD ["sh", "-c", "pm2-runtime start backend/index.js -i ${PM2_INSTANCES:-1}"]

