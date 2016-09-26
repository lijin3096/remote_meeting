const _         = require('lodash');
const Sender    = require('../mq/sender');
const Logger    = require('log4js').getLogger('Apply model');
const HTTP      = require('http');
const httpUtils = require('../utils/HTTPUtils');
const mongoose  = require('../db');
      mongoose.Promise = global.Promise;

function Application() {
  this.sender = Sender;
  this.ApplySchema = new mongoose.Schema({
    name:        String,
    orgCode:     String,
    phone:       String,
    applicant:   String,
    applyHistory: [{
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

  this.model = mongoose.model('Apply', this.ApplySchema);
}

/**
 * Submit an application.
 * 
 * @param {!Object} params for creating an application.
 * @param {Function(Error, number)} callback after commit.
 *   the number of
 *     404 - the applicant is not exist.
 *     400 - an application has been already commited yet.
 *     200 - application submit successfully.
 * @api public
*/
Application.prototype.submit = function(params, callback) {
  Logger.debug(params);
  this.model.findOne({applicant: params.uuid})
    .then((application) => {
      if (application) {
        // date and applicant of params have already existed.
        if ( _.find(application.applyHistory, {applyDate: params.applyDate}) ) {
          return callback(null, 400);
        } else {
          // add new application to history
          application.orgCode = params.orgCode;
          application.phone = params.phone;
          application.applyHistory.push(
            {
              applyDate: params.applyDate,
              feedback: {
                isPass: 'pending',
                meetingTime: '0'
              }
            }
          );

          application.save().then(() => {
            Logger.debug('send to external service');
            let options = {
              host: '103.37.158.17',
              port: 8080,
              path: '/xjp/familyRemoteMeeting/sqFamilyRemoteMeetingRest',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            };

            // FIXME: move this from model to other place
            httpUtils.sendRequest(options, params, function (err, res) {
              if (err) return callback(err);
              Logger.debug(res);
              return callback(null, res);
            });          
          });
        }
      } else {
        callback(null, 404);
      }
    }).catch( (err) => {
      Logger.error(err);
      callback(err);
    });
};

/**
 * Update application after get a feedback from external service.
 * If the application authorized by a prison, send a message to RabbitMQ.
 *
 * @param {!Object} params of feedback property.
 * @param {Function(Error, application)}
 * @api public
*/
Application.prototype.feedback = function(params, callback) {
  Logger.debug(params);
  if (params.from === 'P' && params.isPass === 'PASSED') {
    this.sender.send(params.applyDate + 
      ':' + params.prison + 
      ':' + params.sfs + 
      ':' + params.id);
  }

  this.updateFeedback(params, (err, application) => {
    Logger.debug(application);
    if (err) {
      callback(err);
    } else if (application) {
      callback(null, application);
    } else {
      callback(null, null);
    }
  });
};

/**
 * Update feedback.
 * @param {!Object} params of feedback property.
 * @param {Function(Error, apply)} callback after update.
 * @api private
 */
Application.prototype.updateFeedback = function(params, callback) {
  let feedback = {
    from:        params.from,
    isPass:      params.isPass,
    content:     params.content,
    prison:      params.prison,
    sfs:         params.sfs,
    meetingTime: params.meetingTime
  };

  this.model.findOneAndUpdate(
    {
      applicant: params.applicant,
      'applyHistory.applyDate': params.applyDate
    },
    { $set: {'applyHistory.$.feedback': feedback} },
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
 * Search applications with a condition object.
 * @param {Object} query condition.
 * @param {Function(Error, apply)} cb after search.
 * @api public
 */
Application.prototype.search = function(query, cb) {
  var queryProperties = Object.getOwnPropertyNames(query);
  var condition = {};
  var condition2 = null;
  var isPass = query.isPass || 'PASSED';
      
  queryProperties.forEach((q) => {
    if (q === 'start') {
      condition.$gte = query[q];
    } else if (q === 'end') {
      condition.$lte = query[q];
    }
  });
   
  if (isPass === 'PASSED') {
    condition2 = {'applyHistory.feedback.from': 'M'};
  } else {
    condition2 = {'applyHistory.feedback.isPass': isPass};
  }
  
  Logger.debug(Object.keys(condition2)[0]);
  Logger.debug(condition[Object.keys(condition2)[0]];

  this.model.find({ orgCode: query.orgCode,
                   'applyHistory.applyDate': {$gte: query.start, $lte: query.end},
                   Object.keys(condition2)[0]: condition[Object.keys(condition2)[0]]
                  },
     (err, applications) => {
      if (err) {
        Logger.error(`search error: ${err}`);
        cb(err);
      } else {
        cb(null, this.map(applications, condition, isPass));
      }
  });

};

/**
 * Reject which feedback not comes from `M`.
 * @param {Array} applications - that will be map.
 * @param {Object} condition for searching. 
 * @return {Array} mapping result.
 * @api private
*/
Application.prototype.map = function(applications, isPass) {
  Logger.debug(applications);
  let result = {};
  let history = [];

  applications.forEach((application) => {
    result.name = application.name;
    result.uuid = application.applicant;
    result.phone = application.phone;

    result.application = application.applyHistory.filter(function(h) {
//       if (typeof condition === 'string') {
//         return h.feedback.from === 'M' && h.applyDate === applyDate;
//       } else if (typeof condition === 'object') {
//         return h.feedback.from === 'M' &&
//                h.applyDate >= condition.$gte &&
//                h.applyDate <= condition.$lte;
//       }
       if (isPass === 'PASSED') {
         return h.feedback.from === 'M' &&
                h.applyDate >= condition.$gte &&
                h.applyDate <= condition.$lte;
       } else {
         return h.feedback.isPass === 'DENIED' &&
                h.applyDate >= condition.$gte &&
                h.applyDate <= condition.$lte;
       }
    });

    history.push(result);
  });
  return history;
};

Application.prototype.sender = function(sender) {
  this.sender = sender;
};

module.exports = new Application();
