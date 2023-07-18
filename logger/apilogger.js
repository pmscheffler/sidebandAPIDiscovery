const { send, emitWarning } = require('process');

require('json');

const util = require('util')
// const logTargetIP = '10.1.1.9';
const webServerIP = '10.0.10.188';
const webTargetIP = 'scheff-external-logger.sa.f5demos.com';
const webTargetPort = 80;
const webServerPort = 3000;
const logServerPort = 15514;
// var logIdx = 0;
var logEntries = [];
const querystring = require("querystring");

// Start a web server which will receive our requests
createWebServer();

// start the syslog server which will get the data from the iRule
startSyslog();


function startSyslog() {

    const net = require('net');
    const tls = require('tls');
    const fs = require('fs');
    const crypto = require("crypto");

    const tlsOptions = {
        key: fs.readFileSync('privateKey.key'),
        cert: fs.readFileSync('certificate.crt')
    };

    const dataChunks = []; //[utf8Encode.encode('{ "request": { "headers":[], "payload":"", "method":"get", "uri" : "/" }, "response": { "headers": [], "payload": "" } }') ];

    const server = tls.createServer(tlsOptions, (socket) => {
        let utf8Encode = new TextEncoder();

        // console.log('server connected',
            // socket.authorized ? 'authorized' : 'unauthorized');

        socket.setTimeout(1000);
        
        socket.on('data', data => {
            try {
                // console.log('data');

                var packetData = data.toString().split('\n');
                packetData.forEach(function(packet) {
                    if (packet.length > 0) {
                        try {
                            var jsonData = JSON.parse(querystring.unescape(packet));
                            // refactor to add to redis db
                            // console.log(jsonData);
                            const logIdx = crypto.randomBytes(16).toString("hex");

                            const newElement = {
                                key: logIdx,
                                response: jsonData.response
                            }
    
                            logEntries.push(newElement);

                            let dataChunks = [];
                
                            sendRequest(jsonData.request, logIdx);
                            // logIdx = logIdx + 1;
                        } catch (error) {
                            // console.log(error);
                            // console.log(querystring.unescape(packet));
                            dataChunks.push(utf8Encode.encode(packet));
                            // console.log(`Catch ${dataChunks.length}`);
                        }
                        
                    }
                });

                // dataChunks.push(chunk);
                // console.log(chunk.toString());
                // console.log(`we got data ${dataChunks}`);

            } catch (error) {
                console.log(error.message);
                
            }
        });
        socket.on('end', () => {
            // console.log('closed');            
            let data = Buffer.concat(dataChunks).toString();
            try {
                // console.log(`Closed ${dataChunks.length}`);

                // console.log(`data: ${data}`);
                
                if (dataChunks.length > 0 ){
                    // console.log('In close, with dataChunks > 0');
                    dataChunks.length = 0;
                    closeData = data.toString().split('\n');
                    closeData.forEach(function(cData){
                        var jsonData = JSON.parse(querystring.unescape(cData));
                        // refactor to add to redis db
                        console.log(jsonData);

                        const logIdx = crypto.randomBytes(16).toString("hex");

                        const newElement = {
                            key: logIdx,
                            response: jsonData.response
                        }

                        logEntries.push(newElement);


                        // logEntries.push(jsonData.response);
                        
                        sendRequest(jsonData.request, logIdx);
                        // logIdx = logIdx + 1;
                    });
                } else {
                    // console.log('client disconnected');
                }
            } catch (error) {
                console.log(error);
                console.log(querystring.unescape(data));
                // console.log(querystring.unescape(data));
            }
        });

        socket.on('error', (err) => {
            console.error(err);
        });
        // timer = setTimeout(function() {
        //     // console.log("[ERROR] Attempt at connection exceeded timeout value");
        //     .clientSocket.end();
        // }, timeout);
    });


    server.on('connection', function(c){
        // console.log('insecure connection');
    })

    server.on('secureConnection', function(c){
        // console.log('secure connection');
    })

    server.on('error', (err) => {
        console.error(`Server error: ${err}`);
    });

    server.listen(logServerPort, () => {
        console.log(`Server listening on port ${logServerPort}`);
    });
}


function sendRequest(reqIn, outIdx) {

    let headers = reqIn.headers;
    headers["logIdx"] = outIdx;
    headers["host"] = webTargetIP;

    const options = {
        hostname: webTargetIP,
        port: webTargetPort,
        path: reqIn.uri,
        method: reqIn.method,
        rejectUnauthorized: false,
        headers: headers
    }

    // we are passed the URL + Query String as [http::uri] so, we should be good
    if (reqIn.method.toLowerCase() == "get") {
        // handle the request string
    }
    const http = require('http');

    const req = http.request(options, (res) => {
        let data = '';

        // A chunk of data has been received.
        res.on('data', (chunk) => {
            data += chunk;
            removeElement(logEntries, outIdx);
        });

        // The whole response has been received.
        res.on('end', () => {
            // console.log('Got a response');
            // const escapedData = querystring.unescape(data);
            // console.log(`Data: ${escapedData}`);

            // TODO: clear data from array/db

        });

    });

    try {
        req.write("{data}");
    } catch (error) {
        console.log(`Error sending payload ${error.message}`);
    }

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.end();

}

function createWebServer() {
    const httpWS = require('http');

    const server = httpWS.createServer((req, res) => {

        try {
            if (typeof req.headers['logidx'] == 'undefined') {
                res.setHeader('Content-Type', "application/json");
                res.end("{\"message\": \"Success\"}");
            } else {
                const logEntry = logEntries.find(element => element.key === req.headers['logidx']);
                if (logEntry) {
                    const logResponse = logEntry.response;
                    // console.log(`Log Entry for ${req.headers['logidx']}`, logResponse);
                    // res.setHeader('Content-Type', logResponse.headers["Content-Type"]);
                    res.headers = logResponse.headers;
                    res.statusCode = logEntry.response.status;
                    res.end(logResponse.payload);
                    // console.log(`Sent: `, logResponse.payload);

                } else {
                    console.log(`Log Entry not found for ${req.headers['logidx']}`)
                    res.setHeader('Content-Type', "application/json");
                    res.statusCode = 500;
                    res.end(`Error setting content type ${error.message}\n\n`);
                }
                // logEntries[req.headers['logIdx']] = [];
            }
        } catch (error) {
            // console.log(error);
            res.statusCode = 500;
            res.setHeader('Content-Type', "application/json");
            res.end('{"error":"Internal server error"}');
        }
    });

    server.listen(webServerPort, webServerIP, () => {
        console.log('Server running at http://' + webServerIP + ':' + webServerPort + '/');
    });
}

// Function to remove an element from the array based on the key
function removeElement(array, removeKey) {
    const index = array.findIndex(element => element.key === removeKey);
    if (index !== -1) {
      // Remove the element from the array
      array.splice(index, 1);
      console.log(`Element with key "${removeKey}" removed successfully.`);
    } else {
      console.log(`Element with key "${removeKey}" not found.`);
    }
  }

function createManagementAPI() {
    const httpWS = require('http');

    const server = httpWS.createServer((req, res) => {
        // listen for a call of a particular port for commands to manage the Server

        // /logserver
        // manage the log server
        //    /state POST {"enable": Boolean} => { "result" : success/failure, "message": ""}
        //    /status GET { returns info on the server }
        //    /port POST { "port": Int }
        //    /hostname POST { "hostname": String }
        //    /logging POST { "level": "info/debug/error"}

        // /webserver
        // manage the web server
        //    /state POST {"enable": Boolean} => { "result" : success/failure, "message": ""}
        //    /status GET { returns info on the server }
        //    /port POST { "port": Int }
        //    /hostname POST { "hostname": String }
        //    /logging POST { "level": "info/debug/error"}
        //    

    });

    server.listen(webServerPort, webServerIP, () => {
        console.log('Server running at http://' + webServerIP + ':' + managementPort + '/');
    });    
}