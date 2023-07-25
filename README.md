Run will need to include a reference to the viplist.csv
 - CSV format of vipname, lbtarget

Update the run command to use a host-based key and certificate

To Run the Logger via Docker:

docker run --rm -p 10.0.10.188:3000:3000 -p 10.0.10.188:15514:15514 -e LOGLEVEL=verbose --name apilogger pmscheffler/apilogger 

For XFF to work properly:
 - XFF needs to be enabled on the BIG-IP HTTP Profile
 - Trusted Client IP (with XFF) enabled on the XC LB


 Environment Settings:
 # set the port to listen for incoming log entries
ENV LOGGERPORT=15514
# set the port to listen for incoming web requests from XC LB
ENV WEBPORT=3000
# set the log level info, debug, verbose (see Winston documentation)
ENV LOGLEVEL=info

# set the SAN for the cert to be created (note you can replace the cert in the docker run command)
ENV WEBTARGET=apilogger.f5networks.local

These can be changed at run time with the -e parameter
