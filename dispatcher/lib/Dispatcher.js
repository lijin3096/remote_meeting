const _       = require('lodash');
const logger  = require('log4js').getLogger('Utils');
const Org     = require('../models/orgnization');
const Meeting = require('../models/meeting');

class Dispatcher {

/**
 * @param {String} p - Orgnization code of prison.
 * @param {String} s - Orgnization code of justice.
 * @param {String} applyDate.
 * @param {Function(err, Object)} cb.
 * 
*/
  static init(p, s, applyDate, cb) {
    let self = this;
    Org.shortNumbers(p, s, function (err, orgs) {
      if (err) {
        logger.error(err);
        cb(err);
      } else {
        if (orgs.length !== 2) {
          cb(null, {code: 400});
        } else {
          Meeting.schedules(applyDate, p, s, (err, meetings) => {
            if (err) cb(err);
            else {
              let prison = meetings[0];
              let sfs = meetings[1];
              let res = self.dispatch(prison, orgs[0].shortNumbers, sfs, orgs[1].shortNumbers);
              Meeting.persist(prison, (error, prison) => {
                if (err) {
                  logger.error(err);
                  cb(err);
                } else {
                  Meeting.persist(sfs, (e, sfs) => {
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
   * @param {String} prison - Orgnization code.
   * @param {Array<String>} shortP - short numbers of prison.
   * @param {String} justice - Orgnization code of justice.
   * @param {Array<String>} shortS - short numbers of justice.
   * 
   * @return {Array<String>} - 0 short number of prison,
   *                           1 position in queue,
   *                           2 short number of justice. 
  */
  static dispatch(prison, shortP, justice, shortS) {

    let sPos = this.posUsable(justice.schedule, shortS);
    let pPos = this.posUsable(prison.schedule, shortP);

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
   * param {Object} model
  */
  static persist(model, index, shortNumber, position) {
    let queue = model.schedule[index] === undefined ? [] : model.schedule[index];

    // add `P` to position if position larger than queue length
    let len = queue.length;
    for (let i = 0; i < position - len; i++) {
      queue.push('P');
    }

    if (position === queue.length) queue.push(shortNumber);
    if (queue[position] === 'P') queue[position] = shortNumber;

    model.schedule[index] = queue;
    return model;
  }


  // compare prison and sfs usable positions
  // p: usable index of prison
  // s: usable index of sfs
  // pos: position of usable 
  static compare(a, b) {
    let array = [];

    for (let i = 0; i < a.length; i++) {
      let index = b.indexOf(a[i]);
      if (index !== -1) array.push({ p: i, s: index, pos: a[i] });
    }

    if (array.length > 0) {
      return _.sortBy(array, function (a) { return a.pos; })[0];
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
    let len = 0;
    for (let i = 0; i < array.length; i++) {
      len += array[i][1].length;
      if (len - 1 >= virtualIndex) {
        return i;
      }
    }
  }

  // Get avilable pos in prison schedule
  static posUsable(schedule, shorts) {
    var usable = [];

    for (let i = 0; i < shorts.length; i++) {
      let queue = schedule[i] === undefined ? [] : schedule[i];
      let array = [];

      if (queue.length === 0) {
        array = [i, [0]];
      } else {
        let pendings = this.pendingPos(queue);
        pendings.push(queue.length);
        array = [i, pendings];
      }

      usable.push(array);
    }
    //logger.debug(usable);
    return usable;
  }


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

  /*
   * @queue time list of special terminal
   * return array of indexes of 'P' in queue
  */
  static pendingPos(queue) {
    let p = [];
    if (queue === undefined) return p;

    for (let i = 0; i < queue.length; i++) {
      if (queue[i] === 'P') {
        p.push(i);
      }
    }

    return p;
  }

  static dateString(datetime) {
    return datetime.substring(0, datetime.indexOf('T'));
  }

}

module.exports = Dispatcher;