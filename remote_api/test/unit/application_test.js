const logger = require('log4js').getLogger('application_test');
const chai   = require('chai'),
      expect = chai.expect,
      should = chai.should();
const nock   = require('nock');
const Utils  = require('../../utils/utils');
const Application  = require('../../models/application');
const mongoose = require('mongoose');

describe('Application', function() {
  var conn;

  before(function(done) {
    let today = new Date().toISOString();

    let sender = function() {};
    sender.send = function() {
      logger.debug('send to mock mq');
    };

    // set a mock message queue
    Application.sender(sender);

    nock('http://103.37.158.17:8080', { allowUnmocked: true })
      .post('/xjp/familyRemoteMeeting/sqFamilyRemoteMeetingRest', {
        application: { orgCode: '0997001', name: 'Turky', uuid: '666666' }
      }).reply(200);

    conn = mongoose.connection;
    conn.collection('applications').insertMany([
      { name: 'tester', applicant: '555555', orgCode: '0997001'},
      { name: 'Turky', applicant: '666666' },
      {
        orgCode: '0997001', name: 'Mart', applicant: '777777',
        history: [
          {
            fillingDate: '2016-08-26',
            feedback: { isPass: 'PASSED', meetingTime: '10:00', from: 'S', content: 'PASSED' }
          },
          {
            fillingDate: '2016-08-29',
            feedback: { isPass: 'PASSED', meetingTime: '10:00', from: 'M', content: 'PASSED' }
          }

        ]
      },
      {
        orgCode: '0997001', name: 'Miler', applicant: '888888',
        history: [
          {
            fillingDate: '2016-08-30',
            feedback: { isPass: 'PASSED', meetingTime: '10:30', from: 'M', content: 'PASSED' }
          },
          {
            fillingDate: '2016-08-31',
            feedback: { isPass: 'PASSED', meetingTime: '10:30', from: 'M', content: 'PASSED' }
          }
        ]
      }
    ]);

    done();
  });

  after(function(done) {
    conn.db.dropCollection('applications', function (err) {
      nock.cleanAll();
      nock.enableNetConnect();
      done(err);
    });
  });

  describe('#submit', function() {

    it('expect 404 when applicant was not found.', function(done) {
      Application.submit({orgCode: '0997001', uuid: '6772323232', fillingDate: '2016-08-25' },
        (err, res) => {
          expect(res).to.be.equal(404);
          done(err);
      });
    });

    it('expect 400 when submit an application which with the date of application is already exist.', 
      function(done) {
        Application.submit({orgCode: '0997001', uuid: '777777', fillingDate: '2016-08-29' },
          (err, res) => {
            expect(res).to.be.equal(400);
            done(err);
          });
    });

    it('expect 200 when submit an application successfully.', function(done) {
      Application.submit({orgCode: '0997001', uuid: '666666', fillingDate: '2016-09-03' },
        (err, res) => {
          expect(res).to.be.equal(200);
          done(err);
        });
    });

  });

  describe('#search(query, callback)', function() {
    it('expect result with 2 applicants', function(done) {
      let query = {start: '2016-08-01', end: '2016-09-01', orgCode: '0997001'};
      Application.search(query, (err, result) => {
        expect(result).to.have.length(2);
        done(err);
      });
    });

    it('expect result with 1 applicant.', function(done) {
      let query = {start: '2016-08-31', end: '2016-08-31', orgCode: '0997001'};
      Application.search(query, (err, result) => {
        expect(result).to.have.length(1);
        done(err);
      });
    });
  });

  describe('#feedback(feedback)', function() {
    it('expect null when not found the application', function(done) {
      Application.feedback( {applicant: '232324423', from: 'P', isPass: 'PASSED'}, 
        (err, result) => {
          expect(result).to.be.null;
          done(err);
      });
    });

    it('expect result is not null when feedback successfully', function(done) {
      Application.feedback({
        applicant: "777777",
        fillingDate: "2016-08-26",
        from: "P",
        isPass: "PASSED",
        content: "PASSED"
      }, (err, result) => {
        expect(result).to.not.be.null;
        done(err);
      });
    });
  });

});

