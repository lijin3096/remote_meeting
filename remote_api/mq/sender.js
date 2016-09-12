const logger = require('log4js').getLogger('AMQP');
const amqp   = require('amqplib');
const when   = require('when');

function Sender() {}

Sender.send = function(msg) {
  amqp.connect('amqp://mq').then(function(conn) {
    return when(conn.createChannel()).then(function(ch) {
      let q = 'apply';
      let ok = ch.assertQueue(q, {durable: false});
     
      return ok.then(function(_qok) {
        ch.sendToQueue(q, new Buffer(msg));
        logger.debug(`send ${msg}`);
        return ch.close();
      });
    }).ensure(function() { conn.close(); });
  }).then(null, console.warn);   
};

module.exports = Sender;
