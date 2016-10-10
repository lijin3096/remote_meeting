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
        fillingDate:     String,
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
    .then( (application) => {
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

          application.save().then( () => {
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
    justice:     params.justice,
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
  var eql = null;
  Logger.debug(query.isPass);
  switch (query.isPass) {
    case 'DENIED':
      Logger.debug('d');
      eql = ['$$item.feedback.isPass', 'DENIED'];
      break;
    case 'PENDING':
      Logger.debug('p');
      eql = ['$$item.feedback.isPass', 'pending'];
      break;
    default:
      Logger.debug('m');
      eql = ['$$item.feedback.from', 'M'];     
  }
  
  this.model.aggregate([
    {$match: {orgCode: query.orgCode}},
    {
      $project: {
        name: 1, applicant: 1, phone: 1,
        history: {
          $filter: {
            input: '$history',
            as: 'item',
            cond: { $and: [
              {$gte: ['$$item.fillingDate', query.start]},
              {$lte: ['$$item.fillingDate', query.end]},
              {$eq:  eql}
            ]}
          }
        }
      }
    }
  ], (err, res) => {
    if (err) {
      Logger.error(`Search applications error: ${err}`);
      cb(err);
    } else {
      Logger.debug(this.map(res));
      cb(null, this.map(res));
    }
  });
};

/**
 * Remove applications that history is empty or null.
 * @param {Array} applications - that will be map.
 * @return {Array} mapping result.
 * @api private
*/
Application.prototype.map = function(applications) {
  var filtered = applications.filter((app) => {
    return Array.isArray(app.history);
  }).filter( (app) => {
    return app.history.length > 0;
  });
  return filtered;
};



Application.prototype.sender = function(sender) {
  this.sender = sender;
};

module.exports = new Application();
