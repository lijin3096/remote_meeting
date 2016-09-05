/*'use strict';

process.env.NODE_ENV = 'test';

const logger   = require('log4js').getLogger('apply test');
const chai     = require('chai')
     ,expect   = chai.expect
     ,should   = chai.should();
const mongoose = require('mongoose');
var nock       = require('nock');
      
const Apply    = require('../../models/apply');
const Utils    = require('../../utils/utils');



describe('Apply', function() {

  var conn;

  before(function(done) {

    nock('http://10.93.1.102:9090', { allowUnmocked: true })
              .post('/xjp/familyRemoteMeeting/sqFamilyRemoteMeetingRest', {
                apply: { orgCode: '0997001', name: 'Turky', uuid: '666666' }
              }).socketDelay(2000).reply(200);
    

    mongoose.connect('mongodb://172.18.0.3/remote_meeting_test', function(err) {
      if (err) logger.error(err);

      let today = new Date().toISOString();
      conn = mongoose.connection;

      conn.collection('applies').insertMany([
          { name: 'Turky', applicant: '666666' },

          { orgCode: '0997001', name: 'Mart', applicant: '777777', 
            applyHistory:[
            {applyDate: '2016-08-26', 
              feedback: { isPass: 'PASSED', meetingTime: '10:00', from: 'S', content:'PASSED' }},
            {applyDate: '2016-08-29', 
              feedback: { isPass: 'PASSED', meetingTime: '10:00', from: 'M', content:'PASSED' }}

            ] },

          { orgCode: '0997001', name: 'Miler', applicant: '888888', 
            applyHistory:[
            {applyDate: '2016-08-30', 
              feedback: { isPass: 'PASSED', meetingTime: '10:30', from: 'M', content:'PASSED' }},
            {applyDate: '2016-08-31', 
              feedback: { isPass: 'PASSED', meetingTime: '10:30', from: 'M', content:'PASSED' }}
            ] }
        ]);

      done(err); 
    });
  });

  after(function(done) {

    conn.db.dropCollection('applies', function(err) {
      done(err);
    });
    // mongoose.disconnect(function(err) {
    //   done(err);
    // });
  });
  describe('#commit', function() {

    it('expect 404 when applicant not found', function(done) {
      Apply.commit({orgCode: '0997001', uuid: '6772323232', applyDate: '2016-08-25'}, (err, res) => {
        expect(res).to.be.equal(404);
        done(err);
      })
    });

    it('expect 400 when commit an apply that is already existed', function(done) {
      Apply.commit({orgCode: '0997001', uuid: '777777', applyDate: '2016-08-29'}, (err, res) => {
        expect(res).to.be.equal(400);
        done(err);
      })
    });

/*    it('expect 200 when commit an apply successful', function(done) {
      Apply.commit({orgCode: '0997001', uuid: '666666', applyDate: '2016-08-31'}, (err, res) => {
        
        expect(res).to.be.equal(200);

        done(err);
      })
    });*/

/*  });

  describe('#applicationsOfToday(orgCode, callback)', function() {
    
    it('expect an empty array', function(done) {
      Apply.applicationsOfToday('123', function(err, applies) {
        expect(applies).to.be.empty;
        done(err);
      });
    });

    // it('expect an array with 2 elements', function(done) {
    //   Apply.applicationsOfToday('0997001', function(err, applies) {
    //     expect(applies).to.have.length(2);
    //     expect(applies[0]).to.have.deep.property('applicant').and.equal('777777');
    //     expect(applies[0]).to.have.deep.property('feedback.isPass', 'PASSED');
    //     expect(applies[1]).to.have.deep.property('applicant').and.equal('888888');
    //     expect(applies[1]).to.have.deep.property('feedback.isPass', 'PASSED');
    //     done(err);
    //   })
    // })

  });

  describe('#search(query, callback)', function() {
    it('expect', function(done) {
      let query = { start: '2016-08-01', end: '2016-09-31', orgCode: '0997001'};
      Apply.search(query, (err, result) => {
        expect(result).to.have.length(2);
        done(err);
      })
    })
  });

});*/

