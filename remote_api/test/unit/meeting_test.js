/*'use strict';
process.env.NODE_ENV = 'test';

const logger   = require('log4js').getLogger('user unit test');
const mongoose = require('mongoose');

const chai     = require('chai');
const expect   = chai.expect;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const Meeting  = require('../../models/meeting');
const Factory  = require('rosie').Factory;

before(function(done) {
  mongoose.connect('mongodb://172.18.0.3/remote_meeting_test', function(err) {
  	if (err) logger.error(err);
    done(err);
  });
});

after(function(done) {
  mongoose.connection.db.dropCollection('meetings', function(err) {
    done(err);
  });
});


describe('Meeting', function() {

  describe('#schedules(applyDate, prison, sfs, callback)', function() {
    it('expect an array with two meetings and schedule was empty', function(done) {
      Meeting.schedules('2016-08-25','0991001', '0997001', function(err, meetings) {
        if(err) logger.error(err);
        expect(meetings).to.have.length(2);
        done(err);
      });
    });
  });


  describe('#getSFSSchedule(orgCode, applyDate, callback)', function() {
    it('expect a meetings which orgCode is 0997001', function(done) {
      Meeting.getSFSSchedule('0997001', '2016-08-25', function(err, res) {
        expect(res).to.have.length(1);
        expect(res).to.have.deep.property('[0].orgCode', '0997001');
        done(err);
     });
    })
  });

  describe('#create(applyDate, orgCode, orgType, callback)', function() {
    it('expect a new meeting', function(done) {
      Meeting.create('2016-09-01', '0997002', 's', function(err, meeting) {
        expect(meeting).to.have.property('schedule').to.be.empty;
        done(err);
      })
    });
  });

  describe('#persist(meeting)', function() {
    it('expect a meeting with schedule which has 1 element an equal aa', function(done) {
      let meeting = { applyDate: '2016-08-25', orgCode: '0997001', schedule: [['aa']]};
      Meeting.persist(meeting, function(err, res) {
        expect(res).to.have.property('schedule').and.have.length(1);
        expect(res).to.have.deep.property('schedule[0][0]', 'aa');
        done(err);
      })
    })
  })
  
})

*/