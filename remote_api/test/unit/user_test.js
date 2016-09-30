const logger   = require('log4js').getLogger('user unit test');
const mongoose = require('mongoose');
const expect   = require('chai').expect;
const User     = require('../../models/user');
const Utils    = require('../../utils/utils');

describe('User', function() {
  var id;
  var conn;

  // valid user for testing login
  var user = {
    userid: 'test',
    name: 'test_name',
    phone: '13999999999',
    password: '123456',
    orgnization: {code: '0997001', title: 'test justice'},
    cloudMsg: {cloudID: 'xj001', token: '1234'},
    shorts: ['aa', 'bb', 'cc']
  };

  before(function(done) {
      conn = mongoose.connection;
      Utils.hashedPassword(user.password).then((hashedPassword) => {
        user.hashedPassword = hashedPassword;
        conn.collection('users').insert(user, function(err, u) {
          id = u.ops[0]._id;
          done();
        });
        
      }).catch( (e) => {
         done(e); 
      });
  });

  after(function(done) {
    conn.db.dropCollection('users', function(err) {
      done(err);
    });
  });

  describe('#isValidUser(userid, password, callback)', function(){
    it('expect true when login with correct user information.', function(done) {
      User.isValidUser('test', '123456', function(err, res) {
        expect(res).to.have.property('valid').and.equal(true);
        done();
      });
    });

    it('expect false when login with incorrect password.', function(done) {
      User.isValidUser('test', '654321', function(err, res) {
        expect(res).to.have.property('valid').and.equal(false);
        done();
      });
    });

    it('expect false when user does not found.', function(done) {
      User.isValidUser('test2', '123456', function(err, res) {
        expect(res).to.have.property('valid').and.eql(false);
        done();
      });
    });

    it('expect an error with data and hash arguments required.', function(done) {
      User.isValidUser('test', null, function(err) {
        expect(err).to.be.an('error').and.have.property('message', 'data and hash arguments required');
        done();
      });
    });

  });

  describe('#getUserById(id, callback)', function() {
    it(`expect an user with id ${id}`, function(done) {
      User.getUserById(id, function(err, res) {
        expect(res).to.have.property('_id').and.eql(id);
        done();
      });
    });
  });

  describe('#create(user, callback)', function() {
    it('expect create a new user successful', function(done) {

      let params = {
        userid: 'test02',
        name: 'test_name2',
        phone: '1388888888',
        password: '654321',
        orgnization: {code: '0997002', title: 'test2 justice'},
        cloudMsg: {cloudID: 'xj002', token: '5678'},
        shorts: ['ddd', 'ee', 'ff']
      };
      
      let user = new User.model(newUser);
      user.password = params.password;
      User.create(user, (err, res) => {
        if(err) {
          logger.error(err);
        }
        expect(user).to.have.property('hashedPassword').and.not.null;
        done(err);
      });
    });

  });


});