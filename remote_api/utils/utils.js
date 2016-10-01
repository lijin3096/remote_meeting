const Logger  = require('log4js').getLogger('Utils');
const Bcrypt  = require('bcrypt');
//const _       = require('lodash');
//const Org     = require('../models/orgnization');
//const Meeting = require('../models/meeting');

class Utils {

  /**
   * Return hashed password.
   * @param {string} origin password will be hashed.
   * @return {string} hashed password.
  */
  static hashedPassword (password) {
    return new Promise(function(resolve, reject) {
      Bcrypt.genSalt(10, (err, salt) => {
        if (err) {
          Logger.error(`genSalt error ${err}`);
          reject(err);
        } else {
          Bcrypt.hash(password, salt, (err, hashedPassword) => {
            if(err) reject(err);
            else resolve(hashedPassword);
          });
        }
      });
    });
  }

  /**
   * Valid given string of date with today.
   * @params {string} dateString of given date.
   * @return {boolean} Whether today is lower than given date.
  */
  static validDateWithToday(dateString) {
    let diffTime = new Date(dateString).getTime() - new Date().getTime();
    if (diffTime < 0) {
      return false;
    }
    let diffDates = Math.ceil(diffTime / (1000 * 3600 * 24));
    if (diffDates >= 1 && diffDates <= 30) {
      return true;
    }
    return false;
  }

  /**
   * Return string of date by the given datetime.
   * @param {datetime} instance of Date.
   * @return {string} string of date.
  */
  static dateOfDatetime(datetime) {
    let dateString = datetime.toISOString();
    return dateString.substring(0, dateString.indexOf('T'));
  }

}

module.exports = Utils;