const logger   = require('log4js').getLogger('Prison');
const mongoose = require('./../db');
      mongoose.Promise = global.Promise;

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

module.exports = new Orgnization();