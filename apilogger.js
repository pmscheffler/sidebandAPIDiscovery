const { send, emitWarning } = require('process');

require('json');
const logTargetIP = '10.1.1.9';
const webServerIP = '10.0.10.188';
const webServerPort = 3000;
const logServerPort = 15514;

// Start a web server which will receive our requests
createWebServer();

// start the syslog server which will get the data from the iRule
startSyslog();

var logIdx = 0;
var logEntries = [];


function startSyslog() {
    const querystring = require("querystring");
    const net = require('net');

    const server = net.createServer((socket) => {
        socket.on('data', (data) => {
            var incomingData = querystring.unescape(data);
            var jsonData = {};

            console.log("We got a log message");

            try {
                var jsonData = JSON.parse(incomingData);
            } catch (error) {
                console.log(error);
            }

            logEntries.push(jsonData.response);
            try {
                sendRequest(jsonData.request, jsonData.response, logIdx);
            } catch (error) {
                console.log(error);
            }
            logIdx = logIdx + 1;

        });

        socket.on('end', () => {
            // console.log('client disconnected');
        });

        socket.on('error', (err) => {
            console.error(err);
        });
    });

    server.on('error', (err) => {
        console.error(`Server error: ${err}`);
    });

    server.listen(logServerPort, () => {
        console.log(`Server listening on port ${logServerPort}`);
    });
}


function sendRequest(reqIn, respIn, outIdx) {

    const http = require('http');
    try {
        console.log(reqIn.headers);
    } catch (error) {
        console.log('Error accessing headers');
    }
    let headers = reqIn.headers;
    headers["logIdx"] = outIdx;

    const options = {
        hostname: webServerIP,
        port: webServerPort,
        path: reqIn.uri,
        method: reqIn.method,
        rejectUnauthorized: false,
        headers: headers
    };

    const req = http.request(options, (res) => {
        let data = '';

        // A chunk of data has been received.
        res.on('data', (chunk) => {
            data += chunk;
        });

        // The whole response has been received.
        res.on('end', () => {
            console.log('Got a response');
            console.log(data);
        });

    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    // Write additional data to request body if needed
    // req.write(postData);

    req.end();

}

function createWebServer() {
    const http = require('http');

    const server = http.createServer((req, res) => {

        // console.log('Hey there!');
        // console.log(req);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        // try {
        //     console.log(`Sending: ${JSON.stringify(logEntries[req.headers['logidx']].payload)}`);
        // } catch (error) {
        //     console.log(error);            
        // }
        try {
            if (typeof req.headers['logidx'] == 'undefined' ){
                res.end("Success");
            } else {
                res.end(logEntries[req.headers['logidx']].payload);
            }
        } catch (error) {
            console.log(error);
            res.statusCode = 200;
            res.end('{"error":"Internal server error"}');
        }
    });

    server.listen(webServerPort, webServerIP, () => {
        console.log('Server running at http://'+ webServerIP + ':' + webServerPort + '/');
    });
}

