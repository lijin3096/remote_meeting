const logger   = require('log4js').getLogger('Orgnization unit test');
const mongoose = require('mongoose');
const expect   = require('chai').expect;
const Org      = require('../../models/orgnization');

describe('Orgnization', function() {
  let conn = null;
  before(function(done) {
    conn = mongoose.connection;
    conn.collection('orgnizations').insert({orgCode: '0991001', orgType: 'p', shortNumbers: ['AA', 'BB']},
      function(err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
    });
  });

  after(function(done) {
    conn.collection('orgnizations').remove({orgCode: '0991001'}, function(err) {
      if (err) {
        done(err);
      } else {
        done();
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
          Org.find({orgCode: '0991001'}, function(err, res) {
            if (err) done(err);
            else {
              logger.debug(res);
              done();
            }
          });
        }
      });
    });
  });

});
