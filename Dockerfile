FROM node:12

WORKDIR /usr/src/app

COPY package*.json ./

# install for production
RUN npm ci --only=production

EXPOSE 8080

COPY . .

CMD ["node", "index.js"]