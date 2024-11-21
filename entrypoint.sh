#!/bin/bash

yarn cache clean
rm -rf node_modules dist
yarn install
yarn build:chrome && yarn build:firefox
