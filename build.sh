#!/bin/bash
docker stop calcdex-build
docker rm calcdex-build
docker run -d --name calcdex-build --rm -v $(pwd):/app -w /app -it node:18 /bin/bash -c "cd /app && ./entrypoint.sh"
docker logs -f calcdex-build
