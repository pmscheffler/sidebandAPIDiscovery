FROM alpine:latest

# set the email for the test run
ENV email=dockertest
ENV target=target

# install required tools before switching to the basic user

RUN apk add jq curl

# add the user 'tester' so we aren't running as a priv-user
RUN adduser --disabled-password -S tester
USER tester

WORKDIR /home/tester

# COPY package*.json ./

COPY . .
# RUN chmod +x *.sh

# RUN chown tester *.sh

ENTRYPOINT  "sh" "./bigrun.sh" "$email" "$target"

