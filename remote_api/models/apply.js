const _         = require('lodash');
const Sender    = require('../mq/sender');
const Logger    = require('log4js').getLogger('Apply model');
const HTTP      = require('http');
const HTTPUtils = require('../utils/HTTPUtils');
const mongoose  = require('../db');
      mongoose.Promise = global.Promise;



// set default sender
function Apply() {
  this.sender = Sender;
  this.ApplySchema = new mongoose.Schema({
    name:        String,
    orgCode:     String,
    phone:       String,
    applicant:   String,
    applyHistory: 
      [{
        applyDate:       String,
        feedback: 
          {
            isPass:      String,
            meetingTime: String,
            from:        String,
            content:     String,
            prison:      String,
            sfs:         String
          }
      }]
  });

  this.model = mongoose.model('Apply', ApplySchema);
}

/**
 * Commit a apply.
 * @param {!Object} params for creating an apply.
 * @param {function(Error, number)} callback after commit,
 *     404 - the applicant is not exist;
 *     400 - the apply has been already commited yet;
 *
 * @api public
*/
Apply.prototype.commit = function (params, callback) {
  Logger.debug(params);
  model.findOne({ applicant: params.uuid })
    .then((apply) => {
      if (apply) {
        // date and applicant of params have already existed.
        if (_.find(apply.applyHistory, { applyDate: params.applyDate })) {
          return callback(null, 400);
        } else {
          // add new apply
          apply.orgCode = params.orgCode;
          apply.phone = params.phone;
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
                headers: { 'Content-Type': 'application/json' }
              };

              // FIXME: move this from model to other place
              HTTPUtils.sendRequest(options, params, function (err, res) {
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
      callback(e);
    });
};

/**
 * Update apply after get feedback from external service.
 * When apply allowed by prison, send message to RabbitMQ.
 *
 * @param {!Object} params of feedback property.
 * @param {function(Error, apply)}
 * @api public
*/
Apply.prototype.feedback = function (params, callback) {
  Logger.debug(params);

  if (params.from === 'P' && params.isPass === 'PASSED') {
    this.sender.send(params.applyDate + 
      ':' + params.prison + 
      ':' + params.sfs + 
      ':' + params.id);
  }

  this.updateFeedback(params, (err, apply) => {
    Logger.debug(apply);
    if (err) {
      callback(err);
    } else if (apply) {
      callback(null, apply);
    } else {
      callback(null, null);
    }
  });
};

/**
 * Update feedback of apply.
 * @param {!Object} params of feedback property.
 * @param {function(Error, apply)} callback after update.
 * @api private
 */
Apply.prototype.updateFeedback = function (params, callback) {
  let feedback = {
    from: params.from,
    isPass: params.isPass,
    content: params.content,
    prison: params.prison,
    sfs: params.sfs,
    meetingTime: params.meetingTime
  };

  model.findOneAndUpdate({
      applicant: params.applicant,
      'applyHistory.applyDate': params.applyDate
    },
    { $set: { 'applyHistory.$.feedback': feedback } },
    (err, apply) => {
      if (err) {
        Logger.error(`update feedback error: ${err}`);
        callback(err);
      } else {
        callback(null, apply);
      }
    }
  );
};

/**
 * Search applies with specify conditions.
 * @param {Object} query condition.
 * @param {function(Error, apply)} cb after search.
 * @api public
 */
Apply.prototype.search = function (query, cb) {

  let queryProperties = Object.getOwnPropertyNames(query);
  let condition = {};

  queryProperties.forEach((q) => {
    if (q === 'start') {
      condition.$gte = query[q];
    } else if (q === 'end') {
      condition.$lte = query[q];
    }
  });

  model.find({
    orgCode: query.orgCode,
    'applyHistory.applyDate': condition,
    'applyHistory.feedback.from': 'M'
  }, (err, applies) => {
    if (err) {
      Logger.error(`search error: ${err}`);
      cb(err);
    } else {
      cb(null, this.map(applies, condition));
    }
  });

};

/**
 * Filter method for reject which feedbacks not come from M
 * @param {Array} applies - that will be map.
 * @param {Object} condition for searching. 
 * @return {Array} Map result.
 * @api private
*/
Apply.prototype.map = function (applies, condition) {
  let result = {};
  let history = [];

  Logger.debug(condition);
  applies.forEach((apply) => {
    result.name = apply.name;
    result.uuid = apply.applicant;
    result.phone = apply.phone;

    result.apply = apply.applyHistory.filter(function (h) {
      if (typeof condition === 'string') {
        return h.feedback.from === 'M' && h.applyDate === applyDate;
      } else if (typeof condition === 'object') {
        return h.feedback.from === 'M' &&
          h.applyDate >= condition.$gte &&
          h.applyDate <= condition.$lte;
      }
    });

    history.push(result);
  });
  return history;
};

Apply.prototype.setSender = function (sender) {
  this.sender = sender;
};

module.exports = new Apply();