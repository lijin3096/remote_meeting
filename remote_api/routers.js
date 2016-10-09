const express     = require('express');
const logger      = require('log4js').getLogger('router');
const User        = require('./models/user');
const Org         = require('./models/orgnization');
const Utils       = require('./utils/utils');
//const Meeting     = require('./models/meeting');
const Application = require('./models/application');
const router      = express.Router();

router.get('/', (req, res) => {
  res.send('hello world');
});

// User login
router.post('/api/v1/login', (req, res) => {
  User.isValidUser(req.body.session.userid, req.body.session.password, (err, result) => {
    if (err) {
      res.status(500).send({ error: err });
    } else if(result.valid) {
      res.status(200).send({ user: result.user });
    } else {
      res.status(404).send(result);
    }
  });
});

// create user
router.post('/api/v1/users', (req, res) => {
  let user = new User(req.body.user);
      user.password = req.body.user.password;
  
  User.create(user, (err) => {
    if (err) {
        logger.error(`save user error ${err}`);
        res.status(500).send({ error: 'save user error' });
    } else {
        logger.debug('save user success');
        res.status(200).send({ msg: 'save user success' });
    }
  });
});

// Get feedback from web management
router.post('/api/v1/feedback', (req, res) => {
  if(req.headers.authorization === '8e5946ccc540e5ac5eb5851658681708') {
    Application.feedback(req.body.feedback, (err, application) => {
      if (err) 
        res.status(500).send({ error: 'feedback error' });
      else if (application) 
        res.status(200).send({ msg: 'feedback success' });
      else{
        res.status(404).send({msg: 'application not found'});
      }
    });
  } else {
    res.status(401).send({ msg: 'forbidden' });
  }
});

// Prison settings
router.patch('/api/v1/prisons', (req, res) => {
  if(req.headers.authorization === '8e5946ccc540e5ac5eb5851658681708') {
    Org.config(req.body.settings, (err, result) => {
      if(err) res.status(500).send({ error: 'update settings error' });
      else res.status(200).send( { msg: 'update settings success' });
    });
  } else {
    res.status(401).send({ msg: 'forbidden' });
  }  
});

// Authorization request 
router.all('*', (req, res, next) => {
  let _id = req.headers.authorization;
  if(_id && _id.length === 24) {
    User.getUserById(_id, (err, user) => {
      if(err) {
        logger.error(err);
        res.status(500).send({ error: 'authentication error' });
      } else if(user) {
        logger.debug('authentication success');
        next();
      } else {
        logger.debug('authentication failed');
        res.status(401).send({ msg: 'forbidden' });
      }
    });
  } else {
    logger.debug('authentication invalid');
    res.status(401).send({ msg: 'forbidden' });
  }
});

/**
 * Submit an application.
 * param {object} object - Object with orgCode, uuid and fillingDate.
 * 
 * Get hodiernal applications.
 * params {string} orgCode - The orgnization code.
*/
router.route('/api/v1/applies')
  .post(function(req, res, next) {
    if (Utils.validDateWithToday(req.body.application.fillingDate)) {
      Application.submit(req.body.application, (err, resultCode) => {
        if (err) {
          res.status(500).send({ error: `Submit application error: ${err}` });
          next(err);
        } else {
          switch (resultCode) {
            case 200: 
              res.status(resultCode).send({ msg: '申请提交成功' });
              logger.info(`${req.body.application.phone} 申请提交成功`);
              next();
              break;
            case 400:
              res.status(resultCode).send({ msg: '申请日期重复' });
              logger.info(`${req.body.application.phone} 申请日期重复`);
              next();
              break;
            case 404:
              res.status(resultCode).send({ msg: '用户无申请会见权限' });
              logger.info(`${req.body.application.phone} 用户无申请会见权限`);
              next();
              break;
            default:
              logger.warn(`undefined status ${resultCode}`);
              next();
          }
        }
      });
    } else {
      res.status(400).send({ msg: '该日期不能申请会见'});
      next();
    }
  })
  .get(function(req, res, next) {
    let today = new Date().toISOString();
    let date = today.substring(0, today.indexOf('T'));

    Application.search({orgCode: req.query.orgCode, start: date, end: date}, (err, applies) => {
      if(err) {
        res.status(500).send({ error: 'find applications failed' });
        next(err);
      } else {
        res.status(200).send({ applies: applies });
        next();
      }
    });
    
  });

// Update user's password or phone number.
router.put('/api/v1/users/:id', (req, res) => {
  User.update(req.params.id, req.body.user, (err, result) => {
    if(err) {
      res.status(500).send({ error: 'change password error' });
    } else {
      res.status(200).send({ msg: result });
    }
  });
});

// router.get('/api/v1/orgnizations/:orgCode/meetings', (req, res) => {
//   let today = new Date().toISOString();
//   Meeting.getSFSSchedule(req.params.orgCode, today.substring(0, today.indexOf('T')), 
//     (err, meetings) => {
//     if(err)
//       res.status(500).send({ error: `${err}`});
//     else
//       res.status(200).send({ meetings: meetings});
//   });
// });

router.get('/api/v1/search', (req, res) => {
  let query = { start: req.query.start, end: req.query.end, orgCode: req.query.orgCode };
  Application.search(query, (err, result) => {
    if (err) return res.status(500).send({ error: `${err}` });
    return res.status(200).send({ applies: result });
  });
});

module.exports = router;