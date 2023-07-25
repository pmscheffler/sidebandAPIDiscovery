Run will need to include a reference to the viplist.csv
 - CSV format of vipname, lbtarget

Update the run command to use a host-based key and certificate

To Run the Logger via Docker:

docker run --rm -p 10.0.10.188:3000:3000 -p 10.0.10.188:15514:15514 -e LOGLEVEL=verbose --name apilogger pmscheffler/apilogger 

