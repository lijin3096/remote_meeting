const HTTP   = require('http');
const LOGGER = require('log4js').getLogger('HTTPUtils');

function HTTPUtils() {

}

HTTPUtils.sendRequest = function(options, data, cb) {
  var req = HTTP.request(options, (res) => {    

    let body = '';

    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      cb(null, 200);
    });

  });

  req.on('error', (err) => {
    LOGGER.error(`External service error ${err}`);
    cb(err);
  });

  req.write( JSON.stringify(data) );
  req.end();
}

module.exports = HTTPUtils;
