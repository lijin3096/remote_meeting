'use strict';

const bcrypt    = require('bcrypt');
const Promise   = require('promise');
const logger    = require('log4js').getLogger('User model');

const mongoose  = require('../db');
      mongoose.Promise = global.Promise;

const ObjectId  = mongoose.Types.ObjectId;
const Utils     = require('./../utils/utils');


var UserSchema = new mongoose.Schema({
  userid:           String,
  name:             String,
  phone:            { type:String, default: 'undefined' }, 
  hashedPassword:   String,
  orgnization:      { code: String, title: String },
  cloudMsg:         { cloudID: String, token: String },
  shorts:           [String]

});

/**
 * Validation user for app login.
 * @param {!string} userid - The userid of app user.
 * @param {!string} password - The password of app user.
 * @param {!function(Error, Object)} - callback with validation result,
 * result contains user's information except password.
 * 
*/
UserSchema.statics.isValidUser = function(userid, password, cb) {
  this.findOne({userid: userid}).then((user) => {
    if (user) 
      bcrypt.compare(password, user.hashedPassword, (err, res) => {
        if(err) {
          logger.error(`password compare ${err}`);
          cb(err);
        } else {
          let userProperties = {};

          if (res) 
            userProperties = { 
              userid: user.userid, 
              token: user._id,
              name: user.name,
              phone: user.phone,
              cloudMsg: user.cloudMsg,
              orgnization: user.orgnization 
            };

          cb(null, {valid: res, user: userProperties});
        }
      });
    else 
      return cb(null, {valid: false, user: 'not found'});
  }).catch((err) => { cb(null, {valid: false, user: `found user ${err}`}); });
}


/**
 * Create a new user.
 * @param {!User} user instance.
 * @param {function(?error)} callback.
*/
UserSchema.statics.create = function(user, callback) {
  Utils.hashedPassword(user.password).then((hashedPassword) => {
    user.hashedPassword = hashedPassword;
    user.save(() => {
      callback();
    });
  }).catch((err) => {
    logger.error(`create user ${err}`);
    callback(err);
  });
}

/**
 * Get user by specify _id.
 * @param {string} _id string of ObjectId.
 * @param {function(Error, User)} callback.
*/
UserSchema.statics.getUserById = function(id, cb) {
  logger.debug(id);
  this.findOne({_id: new ObjectId(id)}, (err, user) => {
    if(err) {
      logger.error(`user authorization ${err}`);
      cb(err);
    } else {
      cb(null, user);
    }
  });
}

/**
 * Update phone number and password of specify user by _id.
 * @param {string} _id of user.
 * @param {!Object} params with property name and value that will be updated.
 * @param {!function(Error, string)} callback.
*/
UserSchema.statics.update = function(_id, params, callback) {
 
  this.findOne({ _id: new ObjectId(_id) }).then((user) => {
    if (user) {
      if (params.hasOwnProperty('newPassword')) {
        
        Utils.hashedPassword(params.newPassword).then((hashedPassword) => {
          user.hashedPassword = hashedPassword;
          user.save((err) => {
            if(err) {
              logger.error(`update user error ${err}`);
              callback(err);
            } else callback(null, 'update user success');
          });
        }).catch((err) => {
          callback(err);
        });
      } else {
        user.phone = params.phone;
        user.save().then((res) => {
          callback(null, 'update phone success');
        }).catch((e) => {
          callback(e);
        })
      }
    } else { 
      callback(null, 'no such user');
    }
  });

}

UserSchema.statics.shortNumbers = function(orgCode, cb) {
  this.findOne({ 'orgnization.code': orgCode }).
    select('shortNumbers').exec(function(err, res) {
      cb(err, res);
    })
}



module.exports = mongoose.model('User', UserSchema);