const logger   = require('log4js').getLogger('Meeting');
const mongoose = require('./../db');
      mongoose.Promise = global.Promise;
const Schema   = mongoose.Schema;

function Meeting() {
  this.schema = new Schema({
    orgCode:     String,
    orgType:     String,
    fillingDate: String,
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
    if (m) {
      m.schedule = meeting.schedule;
      m.save().then( (res) => {
        cb(null, res);
      });
    } else {
      cb(null, `[#persist] with date ${meeting.fillingDate} and orgCode ${meeting.orgCode} not found`);
    }
  }).catch( (e) => {
    logger.error(`[#persist] meeting ${meeting.fillingDate} and orgCode ${meeting.orgCode} error: ${err}`);
    cb(e); 
  });
};

/**
 * Return meeting schedule of special filling date
 * and prison code.
 * 
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
 * Return an array with 2 meetings, the first is meeting of prison
 * and second is meeting of justice.
 * 
 * @param {String} fillingDate.
 * @param {String} prison's orgnization code.
 * @param {String} justice's orgnization code.
 * @param {Function(Error, meetings)}
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
        }).catch( (e) => {
          logger.error(`create schedule error: ${e}`);
          cb(e);
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
    } else if (len === 2) {
      cb(null, meetings);
    } else {
      cb(new Error('multi records found'));
    }
  }).catch( (e) => {
     cb(e);
  });
};

/**
 * Return Promise.
 * 
 * @param {String} fillingDate.
 * @param {String} orgCode of orgnization which will be created for meeting model.
 * @param {String} orgType.
 * @return {Object}  new Promise.
 * @api private. 
 */
Meeting.prototype.create = function(fillingDate, orgCode, orgType) {
  let meeting = new this.model({
    fillingDate: fillingDate, orgCode: orgCode, orgType: orgType, schedule:[] 
  });
  return new Promise(function(resolve, reject) {
    meeting.save( (err) => {
      if (err) {
        logger.error(`create meeting error ${err}`);
        reject(err);
      } else {
        resolve(meeting);
      }
    });
  });
};

module.exports = new Meeting();