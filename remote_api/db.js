const Logger   = require('log4js').getLogger('db');
const mongoose = require('mongoose');

function Database() {
  this.env = process.env.NODE_ENV = process.env.NODE_ENV === undefined ? 'development' : process.env.NODE_ENV;
  this.db = this.conn();
  this.db.on('error', (err) => {
    Logger.error(`Database error: ${err}`);
  });

  this.db.once('open', (err) => {
    if(err) {
      Logger.error(`Database open error ${err}`);
    } else {
      Logger.debug('Database open success');
    }
  });
}

/**
 * Return mongoose connection.
 * 
 * @return {Object} connection.
 */
Database.prototype.conn = function() {
  switch (this.env) {
    case 'production':
      mongoose.connect('mongodb://db/remote_meeting_pro');
      break;
    default:
      mongoose.connect('mongodb://db/remote_meeting_dev');
  }
  return mongoose.connection;
};
  

//onst db = new Database().conn();


new Database();
module.exports = mongoose;
