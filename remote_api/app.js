'user strict';

const bodyParser = require('body-parser');
const logger     = require('log4js').getLogger('api');
const express    = require('express');
const app        = express();
const router     = require('./routers');

app.use(bodyParser.json());
app.use(router);

app.listen(3000, () => {
  logger.debug('API listening on port 3000!');
});

module.exports.app = app;
