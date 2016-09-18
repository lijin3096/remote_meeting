const fs = require('fs');
const logger = require('log4js').getLogger('data');

var dir = __dirname;

  fs.watch(`${dir}/data.txt`, (eventType) => {
    logger.debug('df');    
  });


