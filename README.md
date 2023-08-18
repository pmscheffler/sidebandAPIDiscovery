# Out of Band BIG-IP Logging

## Intro

This repo helps extract web traffic from an F5 BIG-IP in real time and then pushes this information to a F5 Distributed Cloud (XC) Load Balancer.  The XC LB can be configured to profile this traffic to determine what API endpoints are being accessed by the client device.

## Set up

### BIG-IP Config

In order to gather the data, the BIG-IP Virutal Server will need to have the iRule (iRules/sidebandLogger.tcl) added.  The iRule references a Data Group (/Common/protected_field) and an HSL Pool (/Common/unencrypted-log-pool).  To allow off-box encrypted log traffic, a VIP needs to be created with no Client SSL profile and a Server SSL Profile, with a pool targeting the incoming log port of the apilogger container (by default, this is 15514).  For more information on how to set up TLS HSL Logging, see this <a href="https://techdocs.f5.com/en-us/bigip-15-0-0/external-monitoring-of-big-ip-systems-implementations/setting-up-secure-remote-logging.html" target="_blank">article</a>

For XFF to work properly:

- XFF needs to be enabled on the BIG-IP HTTP Profile
- Trusted Client IP (with XFF) enabled on the XC LB

### XC Config

In XC, a Load Balancer is required.  This LB has the incoming web server port / ip of the apilogger as it's origin server.  By default, this is port 3000.  For API Discovery to happen on the LB traffic, ensure that Discovery is enabled on the LB Configuration.

### API Logger Config

The API Logger (apilogger container) needs a few items:
Environment Settings:

```bash
# set the port to listen for incoming log entries
ENV LOGGERPORT=15514
# set the port to listen for incoming web requests from XC LB
ENV WEBPORT=3000
# set the log level info, debug, verbose (see Winston documentation)
ENV LOGLEVEL=info
# set the SAN for the cert to be created (note you can replace the cert in the docker run command)
ENV WEBTARGET=apilogger.f5networks.local
```

These can be changed at run time with the -e parameter

Run will need to include a reference to the viplist.csv
CSV format of vipname, lbtarget

## Running the Container

To Run the Logger via Docker or Podman:

```bash
<docker/podman> run --rm -p <localip of vm>:3000:3000 -p <localip of vm>:15514:15514 -e LOGLEVEL=verbose  --name apilogger pmscheffler/apilogger
```

The container includes a basic key and certificate for the TLS connections, but if you want to add a specific key and cert, add this to the run line:

```bash
--mount type=bind,source=<path to your key>,target=/etc/ssl/privateKey.key,readonly --mount type=bind,source=<path to your cert>,target=/etc/ssl/certificate.crt,readonly
```

## Example Run

This line shows running the container and pointing the log files to a local combined.log and error.log, with LOGLEVEL set to debug

```bash
docker run -d --restart unless-stopped -p 10.0.10.188:3000:3000 -p 10.0.10.188:15514:15514 -e LOGLEVEL=debug --mount type=bind,source=$PW
D/combined.log,target=/usr/src/logger/combined.log,readonly --mount type=bind,source=$PWD/error.log,target=/usr/src/logger/error.log,readonly --name a
pilogger pmscheffler/apilogger
```

## Testing

In the /testing folder there is a script which can be used to test against the UDF Blueprint

`<docker/podman> run --rm -d --name tester -e target=<FQDN of api_gw> -e email=<testeremail-prefix> pmscheffler/apilogger-tester`

In the UDF, get the FQDN of the from the api_gw off of the BIG-IP (no HTTPS or trailing /) and pass that to the target parameter
For the email prefix, give is a unique string to be prepended to email for the web user in the test run.  Each time Juice Shop is started, the database of users is reset.
