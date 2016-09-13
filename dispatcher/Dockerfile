FROM node:6.5.0
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev
RUN mkdir /dispatcher
WORKDIR /dispatcher
ADD package.json /dispatcher/package.json
ADD . /dispatcher
RUN npm install -g nodemon
RUN npm install
