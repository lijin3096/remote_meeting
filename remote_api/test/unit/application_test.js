const logger = require('log4js').getLogger('apply test');
const chai = require('chai'),
  expect = chai.expect,
  should = chai.should();
const mongoose = require('mongoose');

var nock = require('nock');
const Apply = require('../../models/application');
const Utils = require('../../utils/utils');

describe('Apply', function () {
  var conn;

  before(function (done) {
    let today = new Date().toISOString();
    let sender = function () { };
    sender.send = function () {
      logger.debug('send to mock mq');
    };

    Apply.sender(sender);

    nock('http://103.37.158.17:8080', { allowUnmocked: true })
      .post('/xjp/familyRemoteMeeting/sqFamilyRemoteMeetingRest', {
        apply: { orgCode: '0997001', name: 'Turky', uuid: '666666' }
      }).reply(200);

    conn = mongoose.connection;
    conn.collection('applies').insertMany([
      { name: 'Turky', applicant: '666666' },  // inited applicant that has not commit any apply

      {
        orgCode: '0997001', name: 'Mart', applicant: '777777',
        applyHistory: [
          {
            applyDate: '2016-08-26',
            feedback: { isPass: 'PASSED', meetingTime: '10:00', from: 'S', content: 'PASSED' }
          },
          {
            applyDate: '2016-08-29',
            feedback: { isPass: 'PASSED', meetingTime: '10:00', from: 'M', content: 'PASSED' }
          }

        ]
      },

      {
        orgCode: '0997001', name: 'Miler', applicant: '888888',
        applyHistory: [
          {
            applyDate: '2016-08-30',
            feedback: { isPass: 'PASSED', meetingTime: '10:30', from: 'M', content: 'PASSED' }
          },
          {
            applyDate: '2016-08-31',
            feedback: { isPass: 'PASSED', meetingTime: '10:30', from: 'M', content: 'PASSED' }
          }
        ]
      }
    ]);

    done();
  });

  after(function (done) {
    conn.db.dropCollection('applies', function (err) {
      nock.cleanAll();
      nock.enableNetConnect();
      done(err);
    });
  });

  describe('#commit', function () {

    it('expect 404 when applicant not found.', function (done) {
      Apply.commit({ orgCode: '0997001', uuid: '6772323232', applyDate: '2016-08-25' }, (err, res) => {
        expect(res).to.be.equal(404);
        done(err);
      });
    });

    it('expect 400 when commit an apply that is already existed.', function (done) {
      Apply.commit({ orgCode: '0997001', uuid: '777777', applyDate: '2016-08-29' }, (err, res) => {
        expect(res).to.be.equal(400);
        done(err);
      });
    });

    it('expect 200 when commit an apply successful.', function (done) {
      Apply.commit({ orgCode: '0997001', uuid: '666666', applyDate: '2016-08-31' }, (err, res) => {
        expect(res).to.be.equal(200);
        done(err);
      });
    });

  });

  describe('#search(query, callback)', function () {
    it('expect an array with 2 elements', function (done) {
      let query = { start: '2016-08-01', end: '2016-09-31', orgCode: '0997001' };
      Apply.search(query, (err, result) => {
        expect(result).to.have.length(2);
        done(err);
      });
    });

    it('expect an array with 1 element', function (done) {
      let query = { start: '2016-08-31', end: '2016-08-31', orgCode: '0997001' };
      Apply.search(query, (err, result) => {
        expect(result).to.have.length(1);
        done(err);
      });
    });
  });

  describe('#feedback(feedback)', function () {
    it('expect null when not found the apply', function (done) {
      Apply.feedback({ from: 'P', isPass: 'PASSED' }, (err, result) => {
        expect(result).to.be.null;
        done(err);
      });
    });

    it('expect', function (done) {
      Apply.feedback({
        applicant: "777777",
        applyDate: "2016-08-26",
        from: "P",
        isPass: "PASSED",
        content: "PASSED"
      }, (err, result) => {
        expect(result).to.not.be.null;
        logger.debug(result);
        done(err);
      });
    });
  });

});

