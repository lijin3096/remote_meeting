#！ /bin/bash
docker-compose down &&
docker rmi remotemeeting_dispatcher #&&
#docker rmi remotemeeting_remote_api &&
docker-compose build &&
docker-compose up -d &&
docker exec -i remotemeeting_dispatcher_1 npm test