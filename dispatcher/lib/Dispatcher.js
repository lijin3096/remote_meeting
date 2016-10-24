const _       = require('lodash');
const logger  = require('log4js').getLogger('Dispatcher');
const Org     = require('../models/orgnization');
const Meeting = require('../models/meeting');

class Dispatcher {

/**
 * @param {String} p - Orgnization code of prison.
 * @param {String} s - Orgnization code of justice.
 * @param {String} fillingDate.
 * @param {Function(err, Object)} cb.
 * 
*/
  static init(p, s, fillingDate, queueId, cb) {
    let self = this;
    Org.shortNumbers(p, s, function (err, orgs) {
      if (err) {
        logger.error(err);
        cb(err);
      } else {
        if (orgs.length !== 2) {
          logger.debug(orgs);
          cb(null, {code: 400});
        } else {
          Meeting.schedules(fillingDate, p, s, (err, meetings) => {
            if (err) cb(err);
            else {
              let prison = meetings[0];
              let justice = meetings[1];
              let res = null;

              logger.debug(`queueId: ${queueId}`);
              if (queueId !== 'undefined'){
                res = self.redispatch(prison, orgs[0].shortNumbers, justice, orgs[1].shortNumbers, queueId);
              } else {
                res = self.dispatch(prison, orgs[0].shortNumbers, justice, orgs[1].shortNumbers);
              }

              Meeting.persist(prison, (error, prison) => {
                if (err) {
                  logger.error(err);
                  cb(err);
                } else {
                  Meeting.persist(justice, (e, justice) => {
                    if (e) {
                      logger.error(e);
                      cb(e);
                    } else {
                      cb(null, {code: 200, res: res});
                    }
                  });
                }
              });
            }
          });
        }
      }
    });
  }

  /**
   * Dispatch terminal with prison and justice short numbers.
   * 
   * @param {String} prison - Model of prison.
   * @param {Array<String>} shortP - short numbers of prison.
   * @param {String} justice - Model of justice.
   * @param {Array<String>} shortS - short numbers of justice.
   * @param {Integer} offset (optional) of position.
   * 
   * @return {Array<String>} - 0 short number of prison,
   *                           1 position in queue,
   *                           2 short number of justice. 
   * @api private
  */
  static dispatch(prison, shortP, justice, shortS) {
    let sPos = this.availablePositions(justice.schedule, shortS);
    let pPos = this.availablePositions(prison.schedule, shortP);

    let sFlatted = this.flatten(sPos);
    let pFlatted = this.flatten(pPos);
    
    let res = this.compare(pFlatted, sFlatted);
    let indexP, indexS, pos;

    if (res.pos === -1) {
      let largestP = this.largestPos(pFlatted);
      let largestS = this.largestPos(sFlatted);

      indexP = this.findCorrespondingIndex(pPos, largestP[0]);
      indexS = this.findCorrespondingIndex(sPos, largestS[0]);
      pos = largestP[1] > largestS[1] ? largestP[1] : largestS[1];

    } else {
      indexP = this.findCorrespondingIndex(pPos, res.p);
      indexS = this.findCorrespondingIndex(sPos, res.s);
      pos = res.pos;
    }

    this.persist(prison, indexP, shortS[indexS], pos);
    this.persist(justice, indexS, shortP[indexP], pos);

    return [shortP[indexP], pos, shortS[indexS]];
  }

  /**
   * Redispatch terminal with prison and justice short numbers.
   * 
   * @param {String} prison - Model of prison.
   * @param {Array<String>} shortP - short numbers of prison.
   * @param {String} justice - Model of justice.
   * @param {Array<String>} shortS - short numbers of justice.
   * @param {Integer} offset (optional) of position.
   * 
   * @return {Array<String>} - 0 short number of prison,
   *                           1 position in queue,
   *                           2 short number of justice. 
   * @api private
  */
  static redispatch(prison, shortP, justice, shortS, queueId) {
    let shortestP = this.shortestQueue(prison.schedule);
    let shortestS = this.shortestQueue(justice.schedule);

    let scheduleOfPrison = shortestP[1];
    let scheduleOfJustice = shortestS[1];

    let max = scheduleOfPrison.length >= scheduleOfJustice.length ? scheduleOfPrison : scheduleOfJustice;
    let position = null;

    if (max.length < queueId) {
      position = queueId + 1;
    } else {
      position = max.length;
    }
    
    scheduleOfPrison[position] = shortS[shortestS[0]];
    scheduleOfJustice[position] = shortP[shortestP[0]];

    this.replaceUndefined(scheduleOfPrison);
    this.replaceUndefined(scheduleOfJustice);

    return [shortP[shortestP[0]], position, shortS[shortestS[0]]];
  }

  /**
   * Reset postions and return an array with prison's 
   * short number, postion and justice's short number.
   * 
   * @param {Array} scheduleOfPrison
   * @param {String} shortNumberOfPrison
   * @param {Array} scheduleOfJustice
   * @param {String} shortNumberOfJustice
   * @param {Integer} currentIndex 
   * @return {Array} The first element is short number of prison.
   *                 The second element is new position.
   *                 The last element is short number of justice.
   */
  // static resetPositions(scheduleOfPrison, shortNumberOfPrison, scheduleOfJustice, shortNumberOfJustice, currentIndex) {
  //   let max = scheduleOfPrison.length >= scheduleOfJustice.length ? scheduleOfPrison : scheduleOfJustice;
  //   let position = null;

  //   if (max.length < currentIndex) {
  //     position = currentIndex + 1;
  //   } else {
  //     position = max.length;
  //   }
    
  //   scheduleOfPrison[position] = shortNumberOfJustice;
  //   scheduleOfJustice[position] = shortNumberOfPrison;

  //   this.replaceUndefined(scheduleOfPrison);
  //   this.replaceUndefined(scheduleOfJustice);

  //   return [shortNumberOfPrison, position, shortNumberOfJustice];
    
  // }

  static replaceUndefined(queue) {
    for (let i = 0; i < queue.length; i++) {
      if (queue[i] === undefined) {
        queue[i] = 'P';
      }
    }
  }
  
  /**
   * Return shortest queue with index.
   * 
   * @param {Array} queues 
   * @return [Integer, Array] the first element is the index of
   *                          which queue is shortest in queues;
   *                          the second element is the shortest queue.
   * @api private
   */
  static shortestQueue(queues) {
    let shortest = queues[0];
    let index = 0;
    for (let i = 1; i < queues.length; i++) {
      if (queues[i].length < shortest.length) {
        shortest = queues[i];
        index = i;
      }
    }
    return [index, shortest];
  }

  /**
   * Return the model which schedule was updated.
   * 
   * @param {Object} model - Meeting model.
   * @param {Integer} index of queue in schedule.
   * @param {String} shortNumber at position.
   * @param {Integer} position in queue will insert short number.
   * @return model.
   * @api private
  */
  static persist(model, index, shortNumber, position) {
    let queue = model.schedule[index] === undefined ? [] : model.schedule[index];

    // add `P` to positions if position larger than queue length
    let len = queue.length;
    for (let i = 0; i < position - len; i++) {
      queue.push('P');
    }

    if (position === queue.length) queue.push(shortNumber);
    if (queue[position] === 'P') queue[position] = shortNumber;

    model.schedule[index] = queue;
    return model;
  }

  /**
   * Compare available postions of prison and justice.
   * 
   * @param {Array} posOfPrison.
   * @param {Array} posOfJustice.
   * @return {Object} - {p, s, pos}
   *                    p: available position index of prison.
   *                    s: available index of justice.
   *                    pos: position at queue.
   * @api private
  */
  static compare(posOfPrison, posOfJustice) {
    let array = [];

    for (let i = 0; i < posOfPrison.length; i++) {
      let index = posOfJustice.indexOf(posOfPrison[i]);
      if (index !== -1) array.push({ p: i, s: index, pos: posOfPrison[i] });
    }

    if (array.length > 0) {
      return _.sortBy(array, function(element) { return element.pos; })[0];
    }

    return { p: -1, s: -1, pos: -1 };
  }

  static flatten(array) {
    let flatted = [];
    for (let i = 0; i < array.length; i++) {
      for (let j = 0; j < array[i][1].length; j++) {
        flatted.push(array[i][1][j]);
      }
    }
    return flatted;
  }

  static findCorrespondingIndex(array, virtualIndex) {
    //let len = 0;
    for (let i = 0, len =0; i < array.length; i++) {
      len += array[i][1].length;
      if (len - 1 >= virtualIndex) {
        return i;
      }
    }
  }

  /** 
   * Return available postions.
   * 
   * @param {Array} schedule of orgnization.
   * @param {Array} shorts - short numbers of orgnization.
   * @param {Integer} queueId - current queue index.
   * @return {Array} available positions of orgnization on
   *                 special day.
   */
  static availablePositions(schedule, shorts) {
    var availables = [];

    for (let i = 0; i < shorts.length; i++) {
      let queue = schedule[i] === undefined ? [] : schedule[i];
      let array = [];

      if (queue.length === 0) {
        array = [i, [0]];
      } else {
        let pendings = this.pendingPositions(queue);
        pendings.push(queue.length);
        array = [i, pendings];
      }
      availables.push(array);
    }
    logger.debug(availables);
    return availables;
  }

  /**
   * Return an array with 2 elements.
   */
  static largestPos(array) {
    let largest = 0;
    let index = 0;

    for (let i = 0; i < array.length; i++) {
      if (array[i] > largest) {
        largest = array[i];
        index = i;
      }
    }
    return [index, largest];
  }

  /**
   * Return an array of positions which value is 'P' 
   * or return an empty array that means there is no
   * element is 'P' in this queue.
   * 
   * @param {Array} queue of short numbers list. e.g ['AA', 'BB'].
   * @return an array of indexes that each index is 'P' in queue.
   * @api private
  */
  static pendingPositions(queue) {
    let p = [];
    if (queue === undefined) return p;

    for (let i = 0; i < queue.length; i++) {
      if (queue[i] === 'P') {
        p.push(i);
      }
    }

    return p;
  }

  /**
   * Return an date string without text 'T'.
   * 
   * @param {String} datetime. e.g '2016-10-10T12:23:50'.
   * @return {String} of date.
   * @api private
   * 
   */
  static dateString(datetime) {
    return datetime.substring(0, datetime.indexOf('T'));
  }
}

module.exports = Dispatcher;