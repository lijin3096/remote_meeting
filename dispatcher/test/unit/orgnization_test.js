const logger   = require('log4js').getLogger('orgnization unit test');
const mongoose = require('mongoose');
const chai     = require('chai'),
      expect   = chai.expect;

const Orgnization  = require('../../models/orgnization');

describe('Orgnization', function() {
  before(function (done) {
    let orgs = [
      {orgCode: '0991001', orgType: 'p', shortNumbers: ['AA', 'BB', 'CC', 'DD']},
      {orgCode: '0997001', orgType: 's', shortNumbers: ['aa', 'bb']},
      {orgCode: '0991002', orgType: 'p', shortNumbers: ['EE', 'FF']},
      {orgCode: '0997002', orgType: 's', shortNumbers: ['cc', 'dd']},
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
    done();
  });

  describe('#shortNumbers', function() {
    it('expect', function(done) {
      Orgnization.shortNumbers('p0991001', 's0997001', function(err, res) {
        logger.debug('**********');
        logger.debug(res);
        expect(res).to.have.deep.property('[0].orgType', 'p');
        expect(res).to.have.deep.property('[1].orgType', 's');
        done(err);
      });
    });
  });

});