const logger   = require('log4js').getLogger('Orgnization unit test');
const mongoose = require('mongoose');
const expect   = require('chai').expect;
const Org      = require('../../models/orgnization');
const Utils    = require('../../utils/utils');

describe('Orgnization', function() {
  let conn = null;
  before(function(done) {
    let today = Utils.dateOfDatetime(new Date());

    conn = mongoose.connection;
    conn.collection('orgnizations').insertMany([
          {orgCode: '0991001', orgType: 'p', shortNumbers: ['AA', 'BB']},
          {orgCode: 'test1', orgType: 'p', shortNumbers: ['FF', 'GG', 'HH']},
          {orgCode: 'test2', orgType: 'p', shortNumbers: ['CC', 'DD', 'EE']}
        ],(err, res) => {
        if (err) {
          done(err);
        } else {
          conn.collection('meetings').insertMany([
            {orgCode: 'test1', fillingDate: today, schedule: [['aa', 'bb', 'cc'], ['pp', 'dd', 'zz', 'jj']]},
            {orgCode: 'test2', fillingDate: '2016-10-10', schedule:[]}], (err, res) => {
              if (err) {
                done(err);
              } else {
                done();
              }
            });
        }
    });
  });

  after(function(done) {
    conn.collection('orgnizations').remove({}, function(err) {
      if (err) {
        done(err);
      } else {
        conn.collection('meetings').remove({}, function(err) {
          if (err)
            done(err);
          else
            done();
        });
      }
    });
    
  });

  describe('#config', function() {
    it('expect short numbers with a new short number', function(done) {
      Org.config({orgCode: '0991001', shortNumbers: ['AA', 'BB', 'CC']}, function(err, res) {
        if (err) {
          logger.error(err);
          done(err);
        } else {
          Org.model.findOne({orgCode: '0991001'}, function(err, res) {
            if (err) done(err);
            else {
              expect(res).to.have.property('shortNumbers');
              expect(res.shortNumbers).to.include('CC');
              done();
            }
          });
        }
      });
    });
  });

  describe('#meetings', function() {
    it('expect an empty array if not found specify orgnization.', function(done) {
      Org.meetings('KK', (err, result) => {
        expect(result).to.be.empty;
        done();
      });
    });

    it('expect an empty array when schedule of prison is empty.', function(done) {
      Org.meetings('DD', (err, result) => {
        logger.debug(result);
        expect(result).to.be.empty;
        done();
      });
    });

    it('expect an array with 3 elements when prison has schedule on today.', function(done) {
      Org.meetings('GG', (err, result) => {
        logger.debug(result);
        expect(result).to.have.length(4);
        done();
      });
    });
  });

});
