const bodyParser = require('body-parser');
const logger     = require('log4js').getLogger('api');
const router     = require('./routers');
const express    = require('express'),
      app        = express();

app.use(bodyParser.json());
app.use(router);

app.listen(3000, () => {
  logger.debug('API listening on port 3000!');
});

