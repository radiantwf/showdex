#/bin/bash
docker run -v $(pwd):/app -w /app -it node:18 /bin/bash

cd /app
yarn install
yarn build:chrome
