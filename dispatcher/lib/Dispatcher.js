
const _ = require('lodash');
const PROMISE = require('promise');

const logger = require('log4js').getLogger('Utils');
const Org = require('../models/orgnization');
const Meeting = require('../models/meeting');

class Dispatcher {

  /**
   * @return [p, index] 
  */
  static dispatch(prison, shortP, sfs, shortS) {


    let sPos = this.posUsable(sfs.schedule, shortS);
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
    this.persist(sfs, indexS, shortP[indexP], pos);

    return [shortP[indexP], pos, shortS[indexS]];

  }

  /**
   * @params
   * @p orgCode of prison
   * @s orgCode of sfs
  */
  static init(p, s, applyDate, cb) {
    let self = this;

    Org.shortNumbers(p, s, function (err, orgs) {
      if (err) {
        logger.error(err);
        cb(err);
      } else {
        if (orgs.length !== 2) {
          cb(null, { code: 400 });
        } else {
          Meeting.schedules(applyDate, p, s, function (err, meetings) {
            if (err) cb(err);
            else {

              let prison = meetings[0];
              let sfs = meetings[1];

              let res = self.dispatch(prison, orgs[0].shortNumbers, sfs, orgs[1].shortNumbers);

              Meeting.persist(prison, function (error, prison) {
                if (err) {
                  logger.error(err);
                  cb(err);
                } else {
                  Meeting.persist(sfs, function (e, sfs) {
                    if (e) {
                      logger.error(e);
                      cb(e);
                    } else {
                      cb(null, { code: 200, res: res });
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

  /*
   * @model  
   * @index
   * @shortNumber
   * @position
  */
  static persist(model, index, shortNumber, position) {
    let queue = model.schedule[index] === undefined ?
      [] : model.schedule[index];

    // add P to position if position larger than length of queue
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

  static hashedPassword(password) {
    return new PROMISE(function (resolve, reject) {
      BCRYPT.genSalt(10, (err, salt) => {
        if (err) {
          logger.error(`genSalt error ${err}`);
          reject(err);
        } else
          BCRYPT.hash(password, salt, (err, hashedPassword) => {
            if (err) reject(err);
            else resolve(hashedPassword);
          });
      });
    });
  }



  static dateString(datetime) {
    return datetime.substring(0, datetime.indexOf('T'));
  }

}

module.exports = Dispatcher;