"use strict";

var logger   = require('log4js').getLogger('db');
var mongoose = require('mongoose');

process.env.NODE_ENV = process.env.NODE_ENV === undefined? 'development' : process.env.NODE_ENV;

switch (process.env.NODE_ENV) {
  case 'production':
    mongoose.connect('mongodb://db/remote_meeting_pro');
    break;
  case 'test':
    //mongoose.connect('mongodb://127.0.0.1:12707/remote_meeting_test');
    break;
  default:
    mongoose.connect('mongodb://db/remote_meeting_dev');
}

logger.debug(process.env.NODE_ENV);   

const db = mongoose.connection;

db.on('error', (err) => {
  logger.error(`Database error: ${err}`);
});

db.once('open', (err) => {
  if(err) logger.error(`Database open error ${err}`);
  else logger.debug('Database open success');
});

module.exports = mongoose;
