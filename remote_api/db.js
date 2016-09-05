"use strict";

const Logger   = require('log4js').getLogger('db');
const mongoose = require('mongoose');

process.env.NODE_ENV = process.env.NODE_ENV === undefined? 'development' : process.env.NODE_ENV;

switch (process.env.NODE_ENV) {
  case 'production':
    mongoose.connect('mongodb://db/remote_meeting_pro');
    break;
  // case 'test':
  //   mongoose.connect('mongodb://db/remote_meeting_test');
  //   break;
  default:
    mongoose.connect('mongodb://db/remote_meeting_dev');
}

Logger.debug(process.env.NODE_ENV);   

const db = mongoose.connection;

db.on('error', (err) => {
  Logger.error(`Database error: ${err}`);
});

db.once('open', (err) => {
  if(err) {
    Logger.error(`Database open error ${err}`);
  } else {
    Logger.debug('Database open success');
  }
});

module.exports = mongoose;
