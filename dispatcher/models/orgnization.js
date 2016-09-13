const logger = require('log4js').getLogger('Prison');
//const Promise = require('promise');

const mongoose  = require('./../db');
      mongoose.Promise = global.Promise;

var OrgnizationSchema = new mongoose.Schema({
    orgCode:        String,
    orgType:        String,
    shortNumbers:   [String]
});

OrgnizationSchema.statics.config = function(params, cb) {
  this.findOneAndUpdate({ orgCode: params.orgCode },
    { shortNumbers: params.shortNumbers },
    function(err, res) {
      if(err) {
        logger.error(`Update prison settings error ${err}`);
        cb(err);
      } else cb();
    }
  );
};

OrgnizationSchema.statics.shortNumbers = function(p, s, cb) {
  this.find().where('orgCode').in([p, s]).sort('orgType').then((res) => {
    if (res) cb(null, res);
  }).catch((e) => { cb(e); });
};


module.exports = mongoose.model('Orgnization', OrgnizationSchema);