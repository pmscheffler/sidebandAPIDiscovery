FROM node:20

WORKDIR /usr/src/logger

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000
EXPOSE 15514

CMD [ "node", "apilogger.js" ]

