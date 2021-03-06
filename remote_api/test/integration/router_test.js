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
  let conn = null;
  let id = null;
  let url = 'http://localhost:3000';
  let today = Utils.dateOfDatetime(new Date());
  let headers = {
  	'Content-Type': 'application/json',
  };

  let user = {
    userid: 'ryman1981',
    name: 'test_name',
    phone: '13999999999',
    password: '123456',
    orgnization: {code: 's0997001', title: 'test justice'},
    cloudMsg: {cloudID: 'xj001', token: '1234'},
    shorts: ['aa', 'bb', 'cc']
  };

  let applicant = {
  	name: 'David Liu',
  	orgCode: 's0997001',
  	applicant: '650104199012124201',
  	history: [
  	  {
  	  	fillingDate: '2016-10-29',
  	  	feedback: {
  	  	  isPass: 'pending'
  	  	}
  	  }
  	]
  };

  let validApplication = { 
  	application: {
  	  orgCode: 's0997001',
  	  uuid: '650104199012124201',
  	  fillingDate: '2016-10-30'
  	}
  };

  before(function(done) {

  	nock('http://103.37.158.17:8080', {allowUnmocked: true})
  	.post('/xjp/familyRemoteMeeting/sqFamilyRemoteMeetingRest', validApplication)
    .reply(200);

  	conn = mongoose.connection;

    Utils.hashedPassword(user.password).then( (hashedPassword) => {
  	  user.hashedPassword = hashedPassword;
      
  	  conn.collection('users').insert(user).then( (u) => {
  	  	id = u.ops[0]._id;
  	    headers.Authorization = id;
  	  }).then( () => {
  	  	conn.collection('applications').insert(applicant).then( () => {
					conn.collection('orgnizations').insertMany([
						{orgCode: '0991001', orgType: 'p', shortNumbers: ['AA', 'BB']},
						{orgCode: 'test1', orgType: 'p', shortNumbers: ['FF', 'GG', 'HH']},
            {orgCode: 'test2', orgType: 'p', shortNumbers: ['CC', 'DD', 'EE']}
					]).then( () => {
						logger.debug(today);
						conn.collection('meetings').insertMany([
              {orgCode: 'test1', fillingDate: today, schedule: [['aa', 'bb', 'cc'], ['pp', 'dd', 'zz', 'jj']]},
              {orgCode: 'test2', fillingDate: '2016-10-10', schedule:[]}
						]).then( () => {
							done();
						});
					});
  	  	});
  	  });
  	}).catch( (e) => {
			logger.error(e);
			done(e); 
		});
  });

  after(function(done) {
    conn.db.dropCollection('users')
		.then( () => {
      conn.db.dropCollection('applications').then( () => {
				conn.db.dropCollection('orgnizations').then( () => {
					conn.db.dropCollection('meetings').then( () => {
						nock.cleanAll();
            nock.enableNetConnect();
						done();
					});
				});
      });
    }).catch( (e) => { done(e); });
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
  });

  describe('POST /api/v1/applies', function() {
  	it('expect status 400 when application date is not valid', function(done) {
  	  chai.request(url)
  	  .post('/api/v1/applies')
  	  .set(headers)
  	  .send({application: {orgCode: 's0997001', uuid: '650104199012124201', fillingDate: '2016-09-30'}})
  	  .end(function(err, res) {
  	  	expect(err).to.be.not.null;
  	  	expect(res).to.have.status(400);
  	  	expect(res.body.msg).to.be.equal('该日期不能申请会见');
  	  	done();
  	  });
  	});

    it('expect status 404 when user which not have permission.', function(done) {
      chai.request(url)
      .post('/api/v1/applies')
      .set(headers)
      .send({application: {orgCode: 's0997001', uuid: '6666666666', fillingDate: '2016-10-29'}})
      .end(function(err, res) {
      	expect(err).to.be.not.null;
      	expect(res).to.have.status(404);
      	expect(res.body.msg).to.be.equal('用户无申请会见权限');
      	done();
      });
    });

    it('expect status 400 when user submit an application which is exist.', function(done) {
      chai.request(url)
      .post('/api/v1/applies')
      .set(headers)
      .send({application: {orgCode: 's0997001', uuid: '650104199012124201', fillingDate: '2016-10-29'}})
      .end(function(err, res) {
      	expect(err).to.be.not.null;
      	expect(res).to.have.status(400);
      	expect(res.body.msg).to.be.equal('申请日期重复');
      	done();
      });
    });

    it('expect status 200 when submit successfully', function(done) {
      chai.request(url)
      .post('/api/v1/applies')
      .set(headers)
      .send(validApplication)
      .end(function(err, res) {
      	expect(err).to.be.null;
      	expect(res).to.have.status(200);
      	expect(res.body.msg).to.be.equal('申请提交成功');
      	done();
      });
    });   
  });

  describe('GET /api/v1/applies', function() {
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
    });
  });

	describe('POST /api/v1/feedback', function() {
		it('expect', function(done) {
			chai.request(url)
			.post('/api/v1/feedback')
			.set({authorization: '8e5946ccc540e5ac5eb5851658681708'})
			.send({feedback: {fillingDate: '2016-09-25', prison: 'p0991002', justice: 's0997001', isPass: 'PASSED', from: 'P'}})
			.end(function(err, res) {
				done();
			});
		});
	});

  describe('PATCH /api/v1/prisons', function() {
		it('expect status 200 after setting', function(done) {
			chai.request(url)
			.patch('/api/v1/prisons')
			.set({authorization: '8e5946ccc540e5ac5eb5851658681708'})
			.send({settings: {orgCode: '0991001', shortNumbers: ['AA','BB','CC']}})
			.end(function(err, res) {
				expect(res).to.have.status(200);
				done();
			});
		});
	});

	describe('GET /api/v1/shortNumbers/:shortNumber/meetings', function() {
		it('expect status 200 but meetings is empty.', function(done) {
			chai.request(url)
			.get('/api/v1/shortNumbers/DD/meetings')
			.set({authorization: '8e5946ccc540e5ac5eb5851658681708'})
			.end(function(err, res) {
				expect(res).to.have.status(200);
				expect(res).to.have.deep.property('res.body.meetings').that.eql([]);
				done(err);
			});
		});

		it('expect status 200 and get an array with 4 elements', function(done) {
			chai.request(url)
			.get('/api/v1/shortNumbers/GG/meetings')
			.set({authorization: '8e5946ccc540e5ac5eb5851658681708'})
			.end(function(err, res) {
				logger.debug(res.body);
				expect(res).to.have.status(200);
				expect(res).to.have.deep.property('res.body.meetings').that.eql(['pp', 'dd', 'zz', 'jj']);
				done(err);
			});
		});

		it('expect status 500', function(done) {
			chai.request(url)
			.get('/api/v1/shortNumbers/ZZ/meetings')
			.set({authorization: '8e5946ccc540e5ac5eb5851658681708'})
			.end(function(err, res) {
				expect(err).to.be.null;
				expect(res).to.have.deep.property('res.body.meetings').that.eql([]);
				done(err);
			});
		});
	});
});