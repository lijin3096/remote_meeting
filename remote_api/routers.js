const express     = require('express');
const logger      = require('log4js').getLogger('router');
const User        = require('./models/user');
const Org         = require('./models/orgnization');
const Utils       = require('./utils/utils');
const Meeting     = require('./models/meeting');
const Application = require('./models/application');
const router      = express.Router();

router.get('/', (req, res) => {
  res.send('hello world');
});

// User login
router.post('/api/v1/login', (req, res) => {
  User.isValidUser( req.body.session.userid, req.body.session.password, (err, result) => {
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
    Apply.feedback(req.body.feedback, (err, apply) => {
      if (err) 
        res.status(500).send({ error: 'feedback error' });
      else if (apply) 
        res.status(200).send({ msg: 'feedback success' });
      else{
        logger.debug('here');
        res.status(404).send({msg: 'apply not found'});
      }
    });
  } else {
    res.status(401).send({ msg: 'forbidden' });
  }
});

// Prison settings
router.post('/api/v1/prisons', (req, res) => {
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
    logger.debug('authentication value not valid');
    res.status(401).send({ msg: 'forbidden' });
  }
});

/**
 * Post an apply.
 * param {object} object - Object with orgCode, uuid and applyDate.
 * 
 * Get applies of today.
 * params {string} orgCode - The orgnization code.
*/
router.route('/api/v1/applies')
  .post(function(req, res, next) {
    if (Utils.validDateWithToday(req.body.apply.applyDate)) {
      Application.commit(req.body.apply, (err, resultCode) => {
        if (err) {
          res.status(500).send({ error: `commit apply ${err}` });
          next(err);
        } else {
          logger.debug(resultCode);
          switch (resultCode) {
            case 200: 
              res.status(resultCode).send({ msg: '申请提交成功' });
              next();
              break;
            case 400:
              res.status(resultCode).send({ msg: '提交日期重复' });
              next();
              break;
            case 404:
              res.status(resultCode).send({ msg: '该用户未有申请会见权限' });
              next();
              break;
          }
        }
      });
    } else {
      res.status(400).send({ msg: 'Apply date is not valid'});
      next();
    }
  })
  .get(function(req, res, next) {
    let today = new Date().toISOString();
    let date = today.substring(0, today.indexOf('T'));

    Application.search({orgCode: req.query.orgCode, start: date, end: date}, (err, applies) => {
      if(err) {
        res.status(500).send({ error: 'find applies failed' });
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

router.get('/api/v1/orgnizations/:orgCode/meetings', (req, res) => {
  let today = new Date().toISOString();
  Meeting.getSFSSchedule(req.params.orgCode, today.substring(0, today.indexOf('T')), 
    (err, meetings) => {
    if(err)
      res.status(500).send({ error: `${err}`});
    else
      res.status(200).send({ meetings: meetings});
  });
});

router.get('/api/v1/search', (req, res) => {
  let query = { start: req.query.start, end: req.query.end, orgCode: req.query.orgCode };
  Application.search(query, (err, result) => {
    if (err) return res.status(500).send({ error: `${err}` });
    return res.status(200).send({ applies: result });
  });
});

module.exports = router;
