const _      = require('lodash');
var logger   = require('log4js').getLogger('Meeting');
var mongoose = require('./../db');
    mongoose.Promise = global.Promise;
      
var Schema   = mongoose.Schema;

var MeetingSchema = new Schema({
  orgCode:     String,
  orgType:     String,
  fillingDate:   String,
  schedule:    [Schema.Types.Mixed]
});

MeetingSchema.statics.persist = function(meeting, cb) {
  this.findOne({fillingDate: meeting.fillingDate, orgCode: meeting.orgCode}).then((m) => {
    if(m) {
      m.schedule = meeting.schedule;
      m.save().then( (res) => {
        cb(null, res);
      });
    } else cb(null, 'can not update');
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
 * @params
 * @fillingDate
 * @prison
 * @justice
*/
MeetingSchema.statics.schedules = function(fillingDate, prison, justice, cb) {
  let self = this;

  this.find({ fillingDate: fillingDate }).where('orgCode').in([prison,justice]).sort('orgType').then((meetings) => {
    let len = meetings.length;

    if (len === 0) {
      
      let array = [];
      array.push({fillingDate: fillingDate, orgType: 'p', orgCode: prison, schedule: []});
      array.push({fillingDate: fillingDate, orgType: 's', orgCode: justice, schedule: []});

      this.collection.insertMany(array).then((res) => {
        self.find({fillingDate: fillingDate}).where('orgCode').in([prison, justice]).sort('orgType').then((ms) => {
          cb(null, ms);
        });
      });
      
    } else if (len === 1) {

      let array = [];
      let meeting = meetings[0];
      let orgCode = meeting.orgType === 'p' ? justice : prison;
      let orgType = meeting.orgType === 'p' ? 's' : 'p';

      self.create(fillingDate, orgCode, orgType).then((m) => {
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
  }).catch((e) => { cb(e); });
};


MeetingSchema.statics.create = function(fillingDate, orgCode, orgType, cb) {
  
  let meeting = new this({ 
        fillingDate: fillingDate, orgCode: orgCode, orgType: orgType, schedule:[] 
      });

  meeting.save((err) => {
    if (err) {
      logger.error(`create meeting error ${err}`);
      cb(err);
    } else {
      cb(null, meeting);
    }
  });
};

MeetingSchema.statics.getSFSSchedule = function(orgCode, fillingDate, cb) {
  this.find({ fillingDate: fillingDate, orgCode: orgCode}).then((result) => {
    return cb(null, result);
  }).catch((e) => { cb(e); });
};


module.exports = mongoose.model('Meeting', MeetingSchema);

