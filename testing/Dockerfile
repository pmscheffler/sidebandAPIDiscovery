FROM node:20

# set the email for the test run
ENV email=dockertest
ENV target=target

RUN useradd -ms /bin/bash --create-home --shell /bin/bash tester
USER tester

WORKDIR /home/tester

# COPY package*.json ./

COPY . .
# RUN chmod +x *.sh

# RUN chown tester *.sh

ENTRYPOINT  "sh" "./bigrun.sh" "$email" "$target"

