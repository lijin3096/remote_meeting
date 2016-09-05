'user strict';

var bodyParser = require('body-parser');
var logger     = require('log4js').getLogger('api');
var express    = require('express');
var app        = express();
var router     = require('./routers');

app.use(bodyParser.json());
app.use(router);

app.listen(3000, () => {
  logger.debug('API listening on port 3000!');
});