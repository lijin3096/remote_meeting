var logger = require('log4js').getLogger('user unit test');
var mongoose = require('mongoose');
var chai = require('chai'),
    expect = chai.expect;

var Meeting = require('../../models/meeting');

describe('Meeting', function () {
  before(function (done) {
    let meetings = [
      {orgCode: 'p0991001', orgType: 'p', applyDate: '2016-09-01'}
    ];
    mongoose.connection.collection('meetings').insertMany(meetings)
    .then((res) => {
       done();
    })
    .catch((err) => {
      done(err);
    });
   
  });

  after(function (done) {
    mongoose.connection.db.dropCollection('meetings', function (err) {
      done(err);
    });
  });

  describe('#schedules(applyDate, prison, sfs, callback)', function () {
    it('expect an array with two meetings and schedule was empty', function (done) {
      Meeting.schedules('2016-08-25', '0991001', '0997001', function (err, meetings) {
        if (err) logger.error(err);
        expect(meetings).to.have.length(2);
        done(err);
      });
    });
  });


  describe('#getSFSSchedule(orgCode, applyDate, callback)', function () {
    it('expect a Meetings which orgCode is 0997001', function (done) {
      Meeting.getSFSSchedule('0997001', '2016-08-25', function (err, res) {
        expect(res).to.have.length(1);
        expect(res).to.have.deep.property('[0].orgCode', '0997001');
        done(err);
      });
    });
  });

  describe('#create(applyDate, orgCode, orgType, callback)', function () {
    it('expect a new Meeting', function (done) {
      Meeting.create('2016-09-01', '0997002', 's', function (err, meeting) {
        expect(meeting).to.have.property('schedule').to.be.empty;
        done(err);
      });
    });
  });

  describe('#persist(Meeting)', function () {
    it('expect a Meeting with schedule which has 1 element an equal aa', function (done) {
      let meeting = { applyDate: '2016-08-25', orgCode: '0997001', schedule: [['aa']] };
      Meeting.persist(meeting, function (err, res) {
        expect(res).to.have.property('schedule').and.have.length(1);
        expect(res).to.have.deep.property('schedule[0][0]', 'aa');
        done(err);
      });
    });
  });

});

