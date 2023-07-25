FROM node:20

# set the port to listen for incoming log entries
ENV LOGGERPORT=15514
# set the port to listen for incoming web requests from XC LB
ENV WEBPORT=3000
# set the log level info, debug, verbose (see Winston documentation)
ENV LOGLEVEL=info

# set the SAN for the cert to be created (note you can replace the cert in the docker run command)
ENV WEBTARGET=apilogger.f5networks.local

WORKDIR /usr/src/logger

COPY package*.json ./

# install the required libraries
RUN npm install
# Run OpenSSL to create the SS key and cert
RUN openssl req -x509 -newkey rsa:4096 -keyout /etc/ssl/privateKey.key -out /etc/ssl/certificate.crt -sha256 -days 3650 -nodes -subj "/C=US/ST=Washington/L=Seattle/O=F5/OU=NASSA/CN=${WEBTARGET}"

COPY . .

RUN chown node /etc/ssl/privateKey.key
RUN chown node /etc/ssl/certificate.crt

# EXPOSE 15514 3000
EXPOSE ${LOGGERPORT} ${WEBPORT}

USER node
ENTRYPOINT  "node" "apilogger.js"

