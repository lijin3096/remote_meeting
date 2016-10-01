const bcrypt    = require('bcrypt');
const logger    = require('log4js').getLogger('User model');
const mongoose  = require('../db');
      mongoose.Promise = global.Promise;

const ObjectId  = mongoose.Types.ObjectId;
const Utils     = require('./../utils/utils');

function User() {
  this.schema = new mongoose.Schema({
    userid:           String,
    name:             String,
    phone:            {type:String, default: 'undefined'}, 
    hashedPassword:   String,
    orgnization:      {code: String, title: String},
    cloudMsg:         {cloudID: String, token: String},
    shorts:           [String]
  });

  this.model = mongoose.model('User', this.schema);
}

/**
 * User validation.
 * @param {!String} userid - The userid of app user.
 * @param {!String} password - The password of app user.
 * @param {!Function(Error, Object)} - callback with validation result,
 *                     and contains user's information except password.
*/
User.prototype.isValidUser = function(userid, password, cb) {
  this.model.findOne({userid: userid}).then( (user) => {
    if (user) 
      bcrypt.compare(password, user.hashedPassword, (err, res) => {
        if(err) {
          logger.error(`Validation error: ${err}`);
          cb(err);
        } else {
          let userProperties = {};

          if (res) {
            userProperties = { 
              userid: user.userid, 
              token: user._id,
              name: user.name,
              phone: user.phone,
              cloudMsg: user.cloudMsg,
              orgnization: user.orgnization 
            };
          }

          cb(null, {valid: res, user: userProperties});
        }
      });
    else 
      return cb(null, {valid: false, user: `User ${userid} not found`});
  }).catch( (err) => { 
    cb(null, {valid: false, user: `Validation error: ${err}`}); 
  });
};


/**
 * Create a new user.
 * @param {!User} user instance.
 * @param {function(?error)} callback.
*/
User.prototype.create = function(user, callback) {
  Utils.hashedPassword(user.password).then( (hashedPassword) => {
    user.hashedPassword = hashedPassword;
    user.save( () => {
      callback();
    });
  }).catch( (err) => {
    logger.error(`create user error: ${err}`);
    callback(err);
  });
};

/**
 * Get user by specify _id.
 * @param {string} _id string of ObjectId.
 * @param {function(Error, User)} callback.
*/
User.prototype.getUserById = function(id, cb) {
  logger.debug(id);
  this.model.findOne({_id: new ObjectId(id)}, (err, user) => {
    if(err) {
      logger.error(`user authorization error: ${err}`);
      cb(err);
    } else {
      cb(null, user);
    }
  });
};

/**
 * Update phone number and password of specify user by _id.
 * @param {String} _id of user.
 * @param {!Object} params with property names 
 *                  and the value will be updated.
 * @param {!Function(Error, string)} callback.
*/
User.prototype.update = function(_id, params, callback) {
  this.model.findOne({ _id: new ObjectId(_id) }).then( (user) => {
    if (user) {
      if (params.hasOwnProperty('newPassword')) {
        Utils.hashedPassword(params.newPassword).then( (hashedPassword) => {
          user.hashedPassword = hashedPassword;
          user.save( (err) => {
            if(err) {
              logger.error(`update user ${_id} error ${err}`);
              callback(err);
            } else callback(null, 'update user success');
          });
        }).catch( (err) => {
          callback(err);
        });
      } else {
        user.phone = params.phone;
        user.save().then( (res) => {
          callback(null, 'update phone success');
        }).catch( (e) => {
          callback(e);
        });
      }
    } else { 
      callback(null, `User ${_id} not found`);
    }
  });

};

/**
 * Get shortNumbers of specify User by orgCode.
 * @param {String} orgCode of a user.
 * @param {Function(Error, Object)}
 */
User.prototype.shortNumbers = function(orgCode, cb) {
  this.model.findOne({'orgnization.code': orgCode})
    .select('shortNumbers').exec( (err, res) => {
      cb(err, res);
    });
};

module.exports = new User();