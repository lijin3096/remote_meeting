FROM node:6.5.0
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev
RUN mkdir /remote_api
WORKDIR /remote_api
ADD package.json /remote_api/package.json
ADD . /remote_api
ADD ../wait-for-it.sh /remote_api
RUN chmod +x ./wait-for-it.sh
RUN mkdir /usr/lib64
RUN cp libstdc++.so.6.0.21 /usr/lib/x86_64-linux-gnu/libstdc++.so.6
RUN npm install -g nodemon
RUN npm install -g pm2
RUN npm install
