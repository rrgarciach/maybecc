FROM node:12.18.2-alpine

USER root

ENV HOME=/home/node/app

WORKDIR $HOME

RUN mkdir node_modules

RUN chown -R node:node $HOME

COPY package.json .

COPY . .

CMD npm start
