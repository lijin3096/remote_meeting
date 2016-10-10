#！ /bin/bash
docker-compose down &&
docker rmi remotemeeting_dispatcher &&
docker rmi remotemeeting_remote_api &&
docker-compose build &&
docker-compose up