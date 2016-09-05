'use strict';

//process.env.NODE_ENV = 'test';

const chaiAsPromised = require('chai-as-promised');
const chaiHttp = require('chai-http');
const chai     = require('chai');
const expect   = chai.expect;
      chai.use(chaiHttp);

const logger   = require('log4js').getLogger('integration test');
const mongoose = require('mongoose'); 
      mongoose.Promise = global.Promise;
const User     = require('../../models/user');
const Utils    = require('../../utils/utils');
const nock     = require('nock');

describe('Router', function() {
  let conn;
  let id;

  let url = 'http://localhost:3000';

  let headers = {
  	'Content-Type': 'application/json',
  };

  let user = {
    userid: 'ryman1981',
    name: 'test_name',
    phone: '13999999999',
    password: '123456',
    orgnization: {code: '0997001', title: 'test sfs'},
    cloudMsg: {cloudID: 'xj001', token: '1234'},
    shorts: ['aa', 'bb', 'cc']
  }

  let applicant = {
  	name: 'David Liu',
  	orgCode: '0997001',
  	applicant: '650104199012124201',
  	applyHistory: [
  	  {
  	  	applyDate: '2016-09-30',
  	  	feedback: {
  	  	  isPass: 'pending'
  	  	}
  	  }
  	]
  }

  let validApply = { 
  	apply: {
  	  orgCode: '0997001',
  	  uuid: '650104199012124201',
  	  applyDate: '2016-09-15'
  	}
  }

  before(function(done) {

  	nock('http://103.37.158.17:8080')
  	.post('/xjp/familyRemoteMeeting/sqFamilyRemoteMeetingRest', validApply)
    .reply(200);

	conn = mongoose.connection;
    Utils.hashedPassword(user.password).then((hashedPassword) => {
	  user.hashedPassword = hashedPassword;
    
	  conn.collection('users').insert(user).then((u) => {
	  	id = u.ops[0]._id;
	    headers['Authorization'] = id;
	  }).then(() => {
	  	conn.collection('applies').insert(applicant).then(() => {
	  	  done();
	  	})
	  })
	}).catch((e) => { done(e); });
  });

  after(function(done) {
    conn.db.dropCollection('users').then(() => {
      conn.db.dropCollection('applies').then(() => {
      	done();
      })
    }).catch((e) => { done(e); });
  });

  describe('/api/v1/login', function() {
  	it('expect status 404 when login with incorrect userid or password', function(done) {
  	  chai.request(url)
  	  .post('/api/v1/login')
  	  .set('Content-Type', 'application/json')
  	  .send({session: {userid: 'test2', password: '123456'}})
  	  .end(function(err, res) {
  	  	expect(err).to.be.not.null;
  	  	expect(res).to.have.status(404);
  	  	done();
  	  });
  	});

  	it('expect status 200 when login with correct userid and password', function(done) {
  	  chai.request(url)
  	  .post('/api/v1/login')
  	  .set('Content-Type', 'application/json')
  	  .send({session: {userid: 'ryman1981', password: '123456'}})
  	  .end(function(err, res) {
  	  	expect(err).to.be.null;
  	  	expect(res).to.have.status(200);
  	  	done(err);
  	  });
  	});
  })

  describe('/api/v1/applies', function() {
  	it('expect status 400 when apply date is before today', function(done) {
  	  chai.request(url)
  	  .post('/api/v1/applies')
  	  .set(headers)
  	  .send({apply: {orgCode: '0997001', uuid: '650104199012124201', applyDate: '2016-09-01'}})
  	  .end(function(err, res) {
  	  	expect(err).to.be.not.null;
  	  	expect(res).to.have.status(400);
  	  	expect(res.body.msg).to.be.equal('Apply date is not valid');
  	  	done();
  	  })
  	});

    it('expect status 404 when user that is not have permission for appling.', function(done) {
      chai.request(url)
      .post('/api/v1/applies')
      .set(headers)
      .send({apply: {orgCode: '0997001', uuid: '6666666666', applyDate: '2016-09-30'}})
      .end(function(err, res) {
      	expect(err).to.be.not.null;
      	expect(res).to.have.status(404);
      	expect(res.body.msg).to.be.equal('该用户未有申请会见权限');
      	done();
      });
    });

    it('expect status 400 when user commit an apply which date is duplicate.', function(done) {
      chai.request(url)
      .post('/api/v1/applies')
      .set(headers)
      .send({apply: {orgCode: '0997001', uuid: '650104199012124201', applyDate: '2016-09-30'}})
      .end(function(err, res) {
      	expect(err).to.be.not.null;
      	expect(res).to.have.status(400);
      	expect(res.body.msg).to.be.equal('提交日期重复');
      	done();
      });
    });

    it('expect status 200 when commit successfully', function(done) {
      chai.request(url)
      .post('/api/v1/applies')
      .set(headers)
      .send(validApply)
      .end(function(err, res) {
      	expect(err).to.be.null;
      	expect(res).to.have.status(200);
      	expect(res.body.msg).to.be.equal('申请提交成功');
      	done();
      });
    });

    it('expect status 200 and get an array of applies which orgCode is 0997001', function(done) {
      chai.request(url)
      .get('/api/v1/applies')
      .set(headers)
      .query('orgCode', '0997001')
      .end(function(err, res) {
      	expect(err).to.be.null;
      	expect(res).to.have.status(200);
      	expect(res.body).to.have.property('applies').and.empty;
      	done();
      });
    })

  })
})
