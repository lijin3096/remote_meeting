'use strict';

const _         = require('lodash');
const MQ        = require('../mq/mq');
const Promise   = require('promise');

const Logger    = require('log4js').getLogger('Apply model');
const HTTP      = require('http');
const HTTPUtils = require('../utils/HTTPUtils');
const mongoose  = require('../db');
    mongoose.Promise = global.Promise;

var ApplySchema = new mongoose.Schema({
  name:             String,
  orgCode:          String,
  applicant:        String,
  applyHistory: [{
    applyDate:      String, 
    feedback: { 
      isPass:       String,
      meetingTime:  String,
      from:         String, 
      content:      String,
      prison:       String, 
      sfs:          String
    } 
  }]      
});

/**
 * Commit a apply.
 * @param {!Object} params for creating an apply.
 * @param {function(Error, number)} callback after commit,
 *     404 - the applicant is not exist;
 *     400 - the apply has been already commited yet;
 *
*/
ApplySchema.statics.commit = function(params, callback) {
  Logger.debug(params);
  this.findOne({applicant: params.uuid})
    .then((apply) => {
      if (apply) {

        // date and applicant of params have already existed.
        if (_.find(apply.applyHistory, {applyDate: params.applyDate})) {
          return callback(null, 400);
        } else {

          // add new apply
          apply.orgCode = params.orgCode;
          apply.applyHistory.push({
            applyDate: params.applyDate,
            feedback: {
              isPass: 'pending',
              meetingTime: '0'
            }
          });

          apply.save((err) => {
            if (err) {
              Logger.error(`update apply ${err}`);
              return callback(err);
            } else {
              Logger.debug('send to external service');
              let options = {
                host: '103.37.158.17',
                port: 8080,
                path: '/xjp/familyRemoteMeeting/sqFamilyRemoteMeetingRest',
                method: 'POST',
                headers: {'Content-Type': 'application/json'}
              };

              // FIXME: move this from model to other place
              HTTPUtils.sendRequest(options, params, function(err, res) {
                Logger.error(err);
                if (err) return callback(err);  // Note: fix this when remote service not avaliable
                Logger.debug(res);
                return callback(null, res);
              });
              
            }
          });
        }
      } else {
        callback(null, 404);
      }
  }).catch((e) => {
    Logger.error(e); 
    callback(e)
  });
}


/**
 * Find applies which dispatched meeting time of current date
 * with specify orgnization.
 * @param {!string} orgCode for query correspending applies
 * @param {function(Error, [Object])} callback after quering.
*/
ApplySchema.statics.applicationsOfToday = function(orgCode, callback) {
  let today = new Date().toISOString();
  let date = today.substring(0, today.indexOf('T'));

  this.find({
    orgCode: orgCode, 
    'applyHistory.feedback.from': 'M',
    'applyHistory.applyDate': date})
  .select('name applicant applyHistory')
  .exec((err, applies) => {
    if (err) {
      Logger.error(`find applies error ${err}`);
      callback(err);
    } else {       
      callback(null, this.prepairApplies(applies, date));
    } 
  });
}


/**
 * Update apply after get feedback from external service.
 * When apply allowed by prison, send message to RabbitMQ.
 * @param {!Object} params of feedback property.
 * @param {function(Error, apply)}
*/ 
ApplySchema.statics.feedback = function(params, callback) {
  Logger.debug(params);

  if (params.from === 'P' && params.isPass === 'PASSED') {
    MQ.send(params.applyDate + ':' + params.prison + ':' + params.sfs + ':' + params.id);
  }

  this.updateFeedback(params, (err, apply) => {
    if (err) {
      Logger.error(err);
      callback(err);
    } else {
      callback(null, apply);
    }
  });
  

}

/**
 * Update feedback of apply.
 * @param {!Object} params of feedback property.
 * @param {function(Error, apply)} callback after update.
 */
ApplySchema.statics.updateFeedback = function(params, callback) {

  let feedback = { 
    from: params.from,
    isPass: params.isPass,
    content: params.content,
    prison: params.prison,
    sfs: params.sfs,
    meetingTime: params.meetingTime
  }

  this.findOneAndUpdate({
      applicant: params.applicant,
      'applyHistory.applyDate': params.applyDate
    },
    { $set: { 'applyHistory.$.feedback': feedback } }, 
    (err, apply) => {
      if(err) {
        Logger.error(`update feedback error: ${err}`);
        callback(err);
      } else {
        callback(null, apply);
      }
    });

}

/**
 * Search applies with specify conditions.
 * @param {Object} query condition.
 * @param {function(Error, apply)} cb after search.
 */
ApplySchema.statics.search = function(query, cb) {
  let queryProperties = Object.getOwnPropertyNames(query);
  let condition = {};

  queryProperties.forEach((q) => {
    if (q === 'start') {
      condition.$gte = query[q];
    } else if (q === 'end') {
      condition.$lte = query[q];
    }
  });

  this.find({
      orgCode: query.orgCode, 
      'applyHistory.applyDate': condition,
      'applyHistory.feedback.from': 'M'
    }, (err, applies) => {
      if (err) {
        Logger.error(`search error: ${err}`);
        cb(err);
      } else {
        cb(null, this.prepairApplies(applies, condition));
      }
    });
}

/**
 * Filter method for reject which feedbacks not come from M
 * @param applies 
*/
ApplySchema.statics.prepairApplies = function(applies, condition) {

  let result = {};
  let history = [];
  Logger.debug(condition);
  applies.forEach((apply) => {
    result.name = apply.name;
    result.uuid = apply.applicant;

    result.apply = apply.applyHistory.filter(function(h) {
      if (typeof condition === 'string') {
        return h.feedback.from === 'M' && h.applyDate === applyDate;
      } else if (typeof condition === 'object') {
        return h.feedback.from === 'M' &&
               h.applyDate >= condition['$gte'] &&
               h.applyDate <= condition['$lte'];
      }
    });

    Logger.debug(result);
    history.push(result);
  });
  return history;
}

module.exports = mongoose.model('Apply', ApplySchema);