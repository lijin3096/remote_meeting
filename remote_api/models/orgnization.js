const logger   = require('log4js').getLogger('Orgnization');
const mongoose = require('./../db');
      mongoose.Promise = global.Promise;
const Utils     = require('./../utils/utils');

function Orgnization() {
  this.schema = new mongoose.Schema({
    orgCode:        String,
    orgType:        String,
    shortNumbers:   [String]
  });
  this.model = mongoose.model('Orgnization', this.schema);
}

Orgnization.prototype.config = function(params, cb) {
  this.model.findOneAndUpdate(
    {orgCode: params.orgCode},
    {shortNumbers: params.shortNumbers},
    (err, res) => {
      if (err) {
        logger.error(`Update prison settings error ${err}`);
        cb(err);
      } else {
        cb(null, res);
      }
  });
};

Orgnization.prototype.shortNumbers = function(prison, justice, cb) {
  this.model.find().where('orgCode')
  .in([prison, justice])
  .sort('orgType')
  .then( (res) => {
    if (res) { 
      cb(null, res);
    }
  }).catch( (e) => {
     cb(e);
  });
};

Orgnization.prototype.meetings = function(shortNumber, cb) {
  this.model.findOne({shortNumbers: shortNumber}).then( (org) => {
    logger.debug(org);
    if (org) {
      let meeting = mongoose.connection.collection('meetings');
      logger.debug(Utils.dateOfDatetime(new Date()));
      meeting.findOne({fillingDate: Utils.dateOfDatetime(new Date()), orgCode: org.orgCode}).then( (m) => {  
        let schedule = [];
        logger.debug(m);
        if (m) {
          schedule = m.schedule[org.shortNumbers.indexOf(shortNumber)];
        }
        logger.debug(schedule);
        cb(null, schedule);
      });
    } else {
      logger.debug(`cannot find orgnization with shortNumber ${shortNumber}`);
      cb(null, []);
    }
  }).catch( (e) => {
    logger.error(e);
    cb(e);
  });
};

module.exports = new Orgnization();