var logger   = require('log4js').getLogger('user unit test');
var mongoose = require('mongoose');

var chai   = require('chai'),
    expect = chai.expect;

var Meeting = require('../../models/meeting');

describe('Meeting', function () {
  before(function (done) {
    let ms = [
      {orgCode: 'p0991001', orgType: 'p', fillingDate: '2016-09-01', schedule: [['1255']]},
      {orgCode: 's0997001', orgType: 's', fillingDate: '2016-09-01', schedule: [['1448']]},

      {orgCode: 's0997001', orgType: 's', fillingDate: '2016-09-02', schedule: [['1448']]},
      {orgCode: 'p0991002', orgType: 'p', fillingDate: '2016-09-02'},
      {orgCode: 'p0991002', orgType: 'p', fillingDate: '2016-09-02'}
    ];

    mongoose.connection.collection('meetings').insertMany(ms, (err, res) => {
      if (err) {
        logger.error(err);
        done(err);
      }
      done();
    });
   
  });

  after(function (done) {
    mongoose.connection.db.dropCollection('meetings', function (err) {
      done(err);
    });
  });

  describe('#schedules(fillingDate, prison, justice, callback)', function () {
    it('expect an array with two meetings that schedules was empty.', function (done) {
      Meeting.schedules('2016-08-25', 'p0991009', 's0997009', function (err, meetings) {
        if (err) {
          logger.error(err);
          done(err);
        }
        expect(meetings).to.have.length(2);
        expect(meetings).to.have.deep.property('[0].orgType', 'p');
        expect(meetings).to.have.deep.property('[1].orgType', 's');
        expect(meetings).to.have.deep.property('[0].schedule').to.be.empty;
        expect(meetings).to.have.deep.property('[1].schedule').to.be.empty;
        done();
      });
    });

    it('expect an array with two meetings and create new meeting with s0997008.', function (done) {
      Meeting.schedules('2016-09-01', 'p0991001', 's0997008', function(err, meetings) {
        if (err) {
          logger.error(err);
          done(err);
        }
        expect(meetings).to.have.length(2);
        expect(meetings).to.have.deep.property('[0].orgType', 'p');
        expect(meetings).to.have.deep.property('[1].orgType', 's');
        expect(meetings).to.have.deep.property('[0].schedule').to.not.be.empty;
        expect(meetings).to.have.deep.property('[1].schedule').to.be.empty;
        done();
      });
    });

    it('expect an array with two meetings and create new meeting with p0991006.', function (done) {
      Meeting.schedules('2016-09-01', 'p0991006', 's0997001', function(err, meetings) {
        if (err) {
          logger.error(err);
          done(err);
        }
        expect(meetings).to.have.length(2);
        expect(meetings).to.have.deep.property('[0].orgType', 'p');
        expect(meetings).to.have.deep.property('[1].orgType', 's');
        expect(meetings).to.have.deep.property('[1].schedule').to.not.be.empty;
        expect(meetings).to.have.deep.property('[0].schedule').to.be.empty;
        done();
      });
    });

    it('expect return an error with', function(done) {
      Meeting.schedules('2016-09-02', 'p0991002', 's0997001', function(err) {
        expect(err).to.be.an('error');
        done();
      });
    });

  });

  describe('#persist(Meeting)', function () {
    it('expect a message with `can not update` when no result with specify conditions.', function(done) {
      let meeting = { fillingDate: '2016-08-25', orgCode: '0997001', schedule: [['aa']] };
      Meeting.persist(meeting, function (err, res) {
        expect(res).to.be.equal('can not update');
        done(err);
      });
    });

    it('expect meeting with a new schedule.', function(done) {
      Meeting.persist({fillingDate: '2016-09-01', orgCode: 's0997001', schedule:[['1448','1448']]},
       function(err, res) {
         logger.debug(res);
         expect(res).to.have.deep.property('schedule[0][0]', '1448');
         done(err);
      });
    });
  });







  // describe('#getSFSSchedule(orgCode, fillingDate, callback)', function () {
  //   it('expect a Meetings which orgCode is 0997001', function (done) {
  //     Meeting.getSFSSchedule('0997001', '2016-08-25', function (err, res) {
  //       expect(res).to.have.length(1);
  //       expect(res).to.have.deep.property('[0].orgCode', '0997001');
  //       done(err);
  //     });
  //   });
  // });

  // describe('#create(fillingDate, orgCode, orgType, callback)', function () {
  //   it('expect a new Meeting', function (done) {
  //     Meeting.create('2016-09-01', '0997002', 's', function (err, meeting) {
  //       expect(meeting).to.have.property('schedule').to.be.empty;
  //       done(err);
  //     });
  //   });
  // });
});

