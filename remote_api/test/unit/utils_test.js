const Logger   = require('log4js').getLogger('user unit test');
const chaiAsPromised = require('chai-as-promised');
const chai     = require('chai'),
      expect   = chai.expect;
      chai.use(chaiAsPromised);
    
const Utils    = require('../../utils/utils');

describe('Utils unit tests', function() {

  describe('#dateOfDatetime(dateTime)', function() {
    it('expect dateString of date that not contains char of T', function() {
      let dateString = Utils.dateOfDatetime(new Date());
      expect(dateString).to.be.a('string');
      expect(dateString).to.not.contain('T');
    });
  });

  describe('#validDateWithToday(dateString)', function() {
    it('expect false when given date is lower than or equal today', function() {
      expect(Utils.validDateWithToday('2016-09-01')).to.be.false;
      expect(Utils.validDateWithToday('2016-09-03')).to.be.false;
    });

    it('expect true when given date is greater than today but difference is lower than or equal 30 days', 
      function() {
        expect(Utils.validDateWithToday('2016-10-03')).to.be.true;
      }
    );

    it('expect false when given date is greater than today and difference is greater than 30 days',
      function() {
        expect(Utils.validDateWithToday('2016-12-30')).to.be.false;
      }
    );
  });

  describe('#hashedPassword(password)', function() {
    it('expect a hashedPassword', function() {
      return expect(Utils.hashedPassword('12345678')).to.eventually.be.a('string');
    });

    it('expect an error with data and salt arguments required message when not give a origin password',
      function() {
        return Utils.hashedPassword().catch(function(err) {
          expect(err).to.be.an('error').and.have.property('message', 'data and salt arguments required');
        });
      }
    );
    
  });

});