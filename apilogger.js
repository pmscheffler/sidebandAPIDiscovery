const { send, emitWarning } = require('process');

require('json');
const util = require('util')
// const logTargetIP = '10.1.1.9';
const webServerIP = '10.0.10.188';
const webTargetIP = 'scheff-external-logger.sa.f5demos.com';
const webTargetPort = 80;
const webServerPort = 3000;
const logServerPort = 15514;
var logIdx = 0;
var logEntries = [];
const querystring = require("querystring");

// Start a web server which will receive our requests
createWebServer();

// start the syslog server which will get the data from the iRule
startSyslog();


function startSyslog() {
    const net = require('net');

    const server = net.createServer((socket) => {
        let utf8Encode = new TextEncoder();
        const dataChunks = []; //[utf8Encode.encode('{ "request": { "headers":[], "payload":"", "method":"get", "uri" : "/" }, "response": { "headers": [], "payload": "" } }') ];
        
        socket.setTimeout(1000);
        
        socket.on('data', data => {
            try {
                var packetData = data.toString().split('\n');
                packetData.forEach(function(packet) {
                    if (packet.length > 0) {
                        try {
                            var jsonData = JSON.parse(querystring.unescape(packet));
                            // refactor to add to redis db
                            // console.log(jsonData);
                            logEntries.push(jsonData.response);

                            let dataChunks = [];
                
                            sendRequest(jsonData.request, logIdx);
                            logIdx = logIdx + 1;
                        } catch (error) {
                            console.log(error);
                            console.log(querystring.unescape(packet));
                            dataChunks.push(packet);
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
            
            try {
                console.log(`Closed ${dataChunks.length}`);

                let data = Buffer.concat(dataChunks).toString();
                // console.log(`data: ${data}`);

                if (dataChunks.length > 0 ){
                    console.log('In close, with dataChunks > 0');
                    var jsonData = JSON.parse(querystring.unescape(data));
                    // refactor to add to redis db
                    console.log(jsonData);
                    logEntries.push(jsonData.response);
                    
                    sendRequest(jsonData.request, logIdx);
                    logIdx = logIdx + 1;
                } else {
                    // console.log('client disconnected');
                }
            } catch (error) {
                console.log(error);
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
        });

        // The whole response has been received.
        res.on('end', () => {
            // console.log('Got a response');
            // const escapedData = querystring.unescape(data);
            // console.log(`Data: ${escapedData}`);
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
                res.end("Success");
            } else {
                try {
                    res.setHeader('Content-Type', logEntries[req.headers['logidx']].headers["Content-Type"]);
                    res.statusCode = logEntries[req.headers['logidx']].status;

                } catch (error) {
                    console.log(`Error setting content type ${error.message} \n\n${logEntries[0]}`);

                }
                res.end(logEntries[req.headers['logidx']].payload);
            }
        } catch (error) {
            console.log(error);
            res.statusCode = 200;
            res.end('{"error":"Internal server error"}');
        }
    });

    server.listen(webServerPort, webServerIP, () => {
        console.log('Server running at http://' + webServerIP + ':' + webServerPort + '/');
    });
}

