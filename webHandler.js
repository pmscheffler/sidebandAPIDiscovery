sendRequest();
function sendRequest(target, targetPort, host, reqPort, reqPath, reqMethod, reqMethod, reqHeaders) {
    const http = require('http');

    const options = {
        hostname: target,
        port: targetPort,
        path: reqPath,
        method: reqPath
    };

    const req = http.request(options, (res) => {
        let data = '';

        // A chunk of data has been received.
        res.on('data', (chunk) => {
            data += chunk;
        });

        // The whole response has been received.
        res.on('end', () => {
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

module.exports = { sendRequest };