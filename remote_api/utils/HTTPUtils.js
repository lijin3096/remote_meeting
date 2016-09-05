var HTTP   = require('http');
var Logger = require('log4js').getLogger('HTTPUtils');

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

    res.on('error', (e) => {
      Logger.error(e);
      cb(e);
    })

  });

  req.on('error', (err) => {
    Logger.error(`External service error ${err}`);
    cb(err);
  });

  req.write( JSON.stringify(data) );
  req.end();
}

module.exports = HTTPUtils;
