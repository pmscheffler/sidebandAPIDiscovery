FROM node:20

WORKDIR /usr/src/logger

COPY package*.json ./

# install the required libraries
RUN npm install
# Run OpenSSL to create the SS key and cert
RUN openssl req -x509 -newkey rsa:4096 -keyout privateKey.key -out certificate.crt -sha256 -days 3650 -nodes -subj "/C=US/ST=Washington/L=Seattle/O=F5/OU=NASSA/CN=apilogger.f5.local"


COPY . .

EXPOSE 5000
EXPOSE 15514

CMD [ "node", "apilogger.js" ]

