'use strict';

const _        = require('lodash');
const promise  = require('promise');
const logger   = require('log4js').getLogger('Meeting');

const mongoose = require('./../db');
      mongoose.Promise = global.Promise;
      
const Schema   = mongoose.Schema;

var MeetingSchema = new mongoose.Schema({
  orgCode:     String,
  orgType:     String,
  applyDate:   String,
  schedule:    [Schema.Types.Mixed]
})

MeetingSchema.statics.persist = function(meeting, cb) {
  this.findOne({applyDate: meeting.applyDate, orgCode: meeting.orgCode}).then((m) => {
    if(m) {
      m.schedule = meeting.schedule;
      m.save().then((res) => {
        cb(null, res);
      })
    } else cb(null, 'can not update');
  }).catch((e) => { cb(e); });
}

MeetingSchema.statics.schedule = function(applyDate, prisonCode, cb) {
  this.findOne( { prisonCode: prisonCode, applyDate: applyDate } ).then((meeting) => {
   
    if (!meeting) {

      meeting = new this({
        applyDate: applyDate,
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
      })
    }

    return cb( null, meeting);
    
  })
}

/**
 * @params
 * @applyDate
 * @prison
 * @sfs
*/
MeetingSchema.statics.schedules = function(applyDate, prison, sfs, cb) {
  let self = this;

  this.find({ applyDate: applyDate }).where('orgCode').in([prison,sfs]).sort('orgType').then((meetings) => {
    let len = meetings.length;

    if (len === 0) {
      
      let array = [];
      array.push({applyDate: applyDate, orgType: 'p', orgCode: prison, schedule: []});
      array.push({applyDate: applyDate, orgType: 's', orgCode: sfs, schedule: []});

      this.collection.insertMany(array).then((res) => {
        self.find({applyDate: applyDate}).where('orgCode').in([prison, sfs]).sort('orgType').then((ms) => {
          cb(null, ms);
        });
      });
      
    } else if (len === 1) {

      let array = [];
      let meeting = meetings[0];
      let orgCode = meeting.orgType === 'p' ? sfs : prison;
      let orgType = meeting.orgType === 'p' ? 's' : 'p';

      self.create(applyDate, orgCode, orgType).then((m) => {
        if (m.orgType === 'p') {
          array = [m, meeting];
        } else {
          array = [meeting, m];
        }
        cb(null, array);
      })
    } else {
      cb(null, meetings);
    }
  }).catch((e) => { cb(e); });
}


MeetingSchema.statics.create = function(applyDate, orgCode, orgType, cb) {
  
  let meeting = new this({ 
        applyDate: applyDate, orgCode: orgCode, orgType: orgType, schedule:[] 
      });

  meeting.save((err) => {
    if (err) {
      logger.error(`create meeting error ${err}`);
      cb(err);
    } else {
      cb(null, meeting);
    }
  })
}

MeetingSchema.statics.getSFSSchedule = function(orgCode, applyDate, cb) {
  this.find({ applyDate: applyDate, orgCode: orgCode}).then((result) => {
    return cb(null, result);
  }).catch((e) => { cb(e); });
}


module.exports = mongoose.model('Meeting', MeetingSchema);
