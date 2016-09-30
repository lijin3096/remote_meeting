const _         = require('lodash');
const Sender    = require('../mq/sender');
const Logger    = require('log4js').getLogger('Apply model');
const HTTP      = require('http');
const httpUtils = require('../utils/HTTPUtils');
const mongoose  = require('../db');
      mongoose.Promise = global.Promise;

function Application() {
  this.sender = Sender;
  this.applicationSchema = new mongoose.Schema({
    name:        String,
    orgCode:     String,
    phone:       String,
    applicant:   String,
    history: [{
        fillingDate:      String,
        feedback: 
          {
            isPass:      String,
            meetingTime: String,
            from:        String,
            content:     String,
            prison:      String,
            justice:     String
          }
      }]
  });

  this.model = mongoose.model('Application', this.applicationSchema);

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
        // Check the applicant has already applyed in special date.
        if ( _.find(application.history, {fillingDate: params.fillingDate}) ) {
          return callback(null, 400);
        } else {
          // add new application to history
          application.orgCode = params.orgCode;
          application.phone = params.phone;
          application.history.push(
            {
              fillingDate: params.fillingDate,
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
            httpUtils.sendRequest(options, params, (err, res) => {
              if (err) return callback(err);
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
    this.sender.send(params.fillingDate + 
      ':' + params.prison + 
      ':' + params.justice + 
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
    justice:         params.justice,
    meetingTime: params.meetingTime
  };

  this.model.findOneAndUpdate(
    {
      applicant: params.applicant,
      'history.fillingDate': params.fillingDate
    },
    { $set: {'history.$.feedback': feedback} },
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
  let condition = {};
  let condition2 = [];
  let isPass = 'PASSED';
      
  Object.getOwnPropertyNames(query).forEach( (q) => {
    if (q === 'start') {
      condition.$gte = query[q];
    } else if (q === 'end') {
      condition.$lte = query[q];
    } else if (q === 'isPass') {
      isPass = query[q];
    }
  });
   
  if (isPass === 'PASSED') {
    condition2 = ['history.feedback.from', 'M'];
  } else {
    condition2 = ['history.feedback.isPass', isPass];
  }
  
  let key = condition2[0];
  let value = condition2[1];

  this.model.find({ orgCode: query.orgCode,
                   'history.fillingDate': {$gte: query.start, $lte: query.end},
                   key: value
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
Application.prototype.map = function(applications, condition, isPass) {
  Logger.debug(applications);
  let result = {};
  let history = [];

  applications.forEach( (application) => {
    result.name = application.name;
    result.uuid = application.applicant;
    result.phone = application.phone;

    result.application = application.history.filter( (h) => {
       if (isPass === 'PASSED') {
         return h.feedback.from === 'M' &&
                h.fillingDate >= condition.$gte &&
                h.fillingDate <= condition.$lte;
       } else {
         return h.feedback.isPass === 'DENIED' &&
                h.fillingDate >= condition.$gte &&
                h.fillingDate <= condition.$lte;
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
