const logger   = require('log4js').getLogger('Meeting');
const mongoose = require('./../db');
      mongoose.Promise = global.Promise;
const Schema   = mongoose.Schema;

function Meeting() {
  this.schema = new Schema({
    orgCode:     String,
    orgType:     String,
    fillingDate:   String,
    schedule:    [Schema.Types.Mixed]
  });

  this.model = mongoose.model('Meeting', this.schema);
}

/**
 * Persist meeting.
 * @param {Object} meeting object.
 * @param {Function(Error, Object)} callback
 */
Meeting.prototype.persist = function(meeting, cb) {
  this.model.findOne( {fillingDate: meeting.fillingDate, orgCode: meeting.orgCode} )
  .then( (m) => {
    if(m) {
      m.schedule = meeting.schedule;
      m.save().then( (res) => {
        cb(null, res);
      });
    } else {
      cb(null, `Meeting with date ${meeting.fillingDate} and orgCode ${meeting.orgCode} not found`);
    }
  }).catch( (e) => {
    logger.error(`Persist meeting error: ${err}`);
    cb(e); 
  });
};

/**
 * Return meeting schedule of special filling date
 * and prison code.
 * @param {String} filling date of application.
 * @param {String} prison orgnization code.
 * @param {Function(Error, Object)} callback.
 */
Meeting.prototype.schedule = function(fillingDate, prisonCode, cb) {
  this.model.findOne( { prisonCode: prisonCode, fillingDate: fillingDate } )
  .then( (meeting) => {
    if (!meeting) {
      meeting = new this({
        fillingDate: fillingDate,
        prisonCode: prisonCode,
        schedule: []
      });

      meeting.save( (err) => {
        if(err) {
          logger.error(`save meeting error ${err}`);
          return cb(err);
        } else {
          return cb( null, meeting );
        }
      });
    }

    return cb( null, meeting); 
  });
};

/**
 * @params
 * @fillingDate
 * @prison
 * @justice
*/
Meeting.prototype.schedules = function(fillingDate, prison, justice, cb) {
  let self = this;

  this.model.find( {fillingDate: fillingDate} )
  .where('orgCode')
  .in([prison,justice])
  .sort('orgType')
  .then( (meetings) => {
    let len = meetings.length;
    if (len === 0) { 
      let array = [];
      array.push({fillingDate: fillingDate, orgType: 'p', orgCode: prison, schedule: []});
      array.push({fillingDate: fillingDate, orgType: 's', orgCode: justice, schedule: []});

      self.model.insertMany(array)
      .then( (res) => {
        self.model.find({fillingDate: fillingDate})
        .where('orgCode')
        .in([prison, justice])
        .sort('orgType')
        .then( (ms) => {
          cb(null, ms);
        });
      });
      
    } else if (len === 1) {

      let array = [];
      let meeting = meetings[0];
      let orgCode = meeting.orgType === 'p' ? justice : prison;
      let orgType = meeting.orgType === 'p' ? 's' : 'p';

      self.create(fillingDate, orgCode, orgType)
      .then( (m) => {
        if (m.orgType === 'p') {
          array = [m, meeting];
        } else {
          array = [meeting, m];
        }
        cb(null, array);
      });
    } else {
      cb(null, meetings);
    }
  }).catch( (e) => {
     cb(e);
  });
};


Meeting.prototype.create = function(fillingDate, orgCode, orgType, cb) {
  let meeting = new this.model({
    fillingDate: fillingDate, orgCode: orgCode, orgType: orgType, schedule:[] 
  });

  meeting.save( (err) => {
    if (err) {
      logger.error(`create meeting error ${err}`);
      cb(err);
    } else {
      cb(null, meeting);
    }
  });
};

Meeting.prototype.getSFSSchedule = function(orgCode, fillingDate, cb) {
  this.model.find({ fillingDate: fillingDate, orgCode: orgCode})
  .then( (result) => {
    return cb(null, result);
  })
  .catch( (e) => {
     cb(e);
   });
};


module.exports = new Meeting();

