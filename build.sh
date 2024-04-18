#/bin/bash
docker run --rm -v $(pwd):/app -w /app -it node:18 /bin/bash

yarn install
yarn build:chrome
