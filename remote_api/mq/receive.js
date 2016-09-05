'use strict';

const amqp      = require('amqplib');
const logger    = require('log4js').getLogger('mq');
const Utils     = require('./../utils/utils');
const HttpUtils = require('./../utils/http_utils');

amqp.connect('amqp://mq').then(function(conn) {

  process.once('SIGINT', function() { conn.close(); });

  return conn.createChannel().then(function(ch) {
    let ok = ch.assertQueue('apply', {durable: false});
    
    ok = ok.then(function(_qok) {
      return ch.consume('apply', function(msg) {
        
        let array = msg.content.toString().split(':');
        let p = array[1];
        let s = array[2];
        let id = array[3];

        let res = Utils.init(p, s, array[0], function(err, res) {
          logger.debug(res);
          if (err) logger.error(err);
          else {
            let options = {
              host:     '10.93.1.102',
              port:     9090,
              path:     '/xjp/familyRemoteMeeting/allocationMeetingTime',
              method:   'POST',
              headers:  { 'Content-Type': 'application/json' }
            };

            let data = {
              id: id,
              terminalId: res.res[0],
              queueId: res.res[1],
              sfs: res.res[2]
            }

            HttpUtils.sendRequest(options, data, function(err, res) {
              logger.debug(data);
              if (err) logger.error(err);
              else logger.debug(res);
            });
          }
        });

      }, {noAck: true});
    });
    
    return ok.then(function(_consumeOk) {
      logger.debug(' [*] Waiting for messages. To exit press CTRL+C');
    });

  });
}).then(null, console.warn);