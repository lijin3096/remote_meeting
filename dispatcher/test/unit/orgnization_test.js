const logger   = require('log4js').getLogger('orgnization unit test');
const mongoose = require('mongoose');
const chai     = require('chai'),
      expect   = chai.expect;

const Orgnization  = require('../../models/orgnization');

describe('Orgnization', function() {
  before(function (done) {
    let orgs = [
      {orgCode: 'prison1', orgType: 'p', shortNumbers: ['AA', 'BB', 'CC', 'DD']},
      {orgCode: 'justice1', orgType: 's', shortNumbers: ['aa', 'bb']},
      {orgCode: 'prison2', orgType: 'p', shortNumbers: ['EE', 'FF']},
      {orgCode: 'justice2', orgType: 's', shortNumbers: ['cc', 'dd']},
    ];

    mongoose.connection.collection('orgnizations').insertMany(orgs, (err, res) => {
      if (err) {
        logger.error(err);
        done(err);
      }
      done();
    });
   
  });

  after(function (done) {
    mongoose.connection.db.dropCollection('orgnizations', function(err) {
      if (err) {
        logger.error(err);
        done(err);
      } else {
        done();
      }
    });
  });

  describe('#shortNumbers', function() {
    it('expect', function(done) {
      Orgnization.shortNumbers('prison1', 'justice1', function(err, res) {
        logger.debug(res);
        expect(res).to.have.deep.property('[0].orgType', 'p');
        expect(res).to.have.deep.property('[1].orgType', 's');
        done(err);
      });
    });
  });

});