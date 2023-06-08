const { send, emitWarning } = require('process');

require('json');
// const logTargetIP = '10.1.1.9';
const webServerIP = '10.0.10.188';
const webTargetIP = 'scheff-external-logger.sa.f5demos.com';
const webTargetPort = 80;
const webServerPort = 3000;
const logServerPort = 15514;

// Start a web server which will receive our requests
createWebServer();

// start the syslog server which will get the data from the iRule
startSyslog();

var logIdx = 0;
var logEntries = [];
const querystring = require("querystring");

function startSyslog() {
    // const querystring = require("querystring");
    const net = require('net');

    const server = net.createServer((socket) => {
        socket.on('data', (data) => {
            try {
                var incomingData = querystring.unescape(data);
                var jsonData = {};

                var jsonData = JSON.parse(incomingData);
                // console.log(jsonData.response);
                logEntries.push(jsonData.response);

                sendRequest(jsonData.request, jsonData.response, logIdx);
                logIdx = logIdx + 1;
            } catch (error) {
                console.log(error);
                console.log(querystring.unescape(data));
            }
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
    // try {
    //     console.log(reqIn.headers);
    // } catch (error) {
    //     console.log('Error accessing headers');
    //     console.log(`Request ${reqIn}`);
    // }
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
    if (reqIn.method.toLowerCase() == "get" ) {
        // handle the request string
    }

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
        
        try {
            if (typeof req.headers['logidx'] == 'undefined') {
                res.end("Success");
            } else {
                try {
                    logEntry = JSON.parse(logEntries[req.headers['logidx']]);
                    res.setHeader('Content-Type', logEntries[req.headers['logidx']].headers["content-type"]);
                } catch (error) {
                    console.log(`Error setting content type ${error.message} \n\n${logEntries[0]}`);

                }                
                // console.log(req);
                // res.end("we made it here");
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

