const _        = require('lodash');
const logger   = require('log4js').getLogger('Meeting');
const mongoose = require('./../db');
      mongoose.Promise = global.Promise;
      
const Schema   = mongoose.Schema;

const MeetingSchema = new mongoose.Schema({
  orgCode:     String,
  orgType:     String,
  fillingDate:   String,
  schedule:    [Schema.Types.Mixed]
});

MeetingSchema.statics.persist = function(meeting, cb) {
  this.findOne({fillingDate: meeting.fillingDate, orgCode: meeting.orgCode}).then((m) => {
    if (m) {
      m.schedule = meeting.schedule;
      m.save().then((res) => {
        cb(null, res);
      });
    } else {
     cb(null, 'can not update');
    }
  }).catch((e) => { cb(e); });
};

MeetingSchema.statics.schedule = function(fillingDate, prisonCode, cb) {
  this.findOne( { prisonCode: prisonCode, fillingDate: fillingDate } ).then((meeting) => {
   
    if (!meeting) {

      meeting = new this({
        fillingDate: fillingDate,
        prisonCode: prisonCode,
        schedule: []
      });

      meeting.save((err) => {
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
 * Return schedules of prison and justice.
 *
 * @param {String} fillingDate - Date of apply.
 * @param {String} prison - Orgnization code of prison.
 * @param {String} justice - Orgnization code of justice.
 * @param {Function(err, schedules)} cb - Callback after query.
 * 
*/
MeetingSchema.statics.schedules = function(fillingDate, prison, justice, cb) {
  let self = this;

  this.find( {fillingDate: fillingDate} )
      .where( 'orgCode' )
      .in( [prison,justice] )
      .sort( 'orgType' )
      .then( (meetings) => {
        let len = meetings.length;

        switch (len) {
          case 0:
            logger.debug('create two meetings');
            meetings.push( {fillingDate: fillingDate, orgType: 'p', orgCode: prison, schedule: []} );
            meetings.push( {fillingDate: fillingDate, orgType: 's', orgCode: justice, schedule: []} );

            this.collection.insertMany(meetings).then((res) => {
              self.find({fillingDate: fillingDate})
                  .where( 'orgCode' )
                  .in( [prison, justice] )
                  .sort( 'orgType' )
                  .then( (meetings) => {
                    cb(null,meetings);
                  });
            });
            break;
          case 1:
            logger.debug('create one meeting');
            let array = [];
            let meeting = meetings[0];

            let orgCode = meeting.orgType === 'p' ? justice : prison;
            let orgType = meeting.orgType === 'p' ? 's' : 'p';

            let m = new self({ 
                fillingDate: fillingDate, orgCode: orgCode, orgType: orgType, schedule:[] 
            });

            m.save((err) => {
              if (err) {
                logger.error(err);
                cb(err);
              } else {
                array.push(meeting);
                array.push(m);
                cb(null, _.sortBy(array, ['orgType']));
              }
            });
            break;
          case 2:
            logger.debug('return meetings directly');
            cb(null, meetings);
            break;
          default:
            logger.debug('more than two meetings found');
            cb(new Error('multi result found'));
        }
  }).catch( (e) => {
    logger.error(e);
    cb(e); 
  });
};

// MeetingSchema.statics.getSFSSchedule = function(orgCode, fillingDate, cb) {
//   this.find({ fillingDate: fillingDate, orgCode: orgCode}).then((result) => {
//     return cb(null, result);
//   }).catch((e) => { cb(e); });
// };

module.exports = mongoose.model('Meeting', MeetingSchema);

