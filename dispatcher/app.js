const AMQP = require('amqplib');
const logger = require('log4js').getLogger('mq');
const Dispatcher = require('./lib/Dispatcher');
const httpUtils = require('./lib/utils/HTTPUtils');

AMQP.connect('amqp://mq').then(function (conn) {

  process.once('SIGINT', function () { conn.close(); });

  return conn.createChannel().then(function (ch) {
    let ok = ch.assertQueue('apply', { durable: false });

    ok = ok.then(function (_qok) {
      return ch.consume('apply', function (msg) {

        let content = msg.content.toString().split(':');
        let p = content[1];
        let s = content[2];
        let id = content[3];
        let queueId = content[4];

        let res = Dispatcher.init(p, s, content[0], queueId ,(err, res) => {
          if (err) {
            logger.error(err);
          } else if (res.code === 200) {
            let options = {
              host: '103.37.158.17',
              port: 8080,
              path: '/xjp/familyRemoteMeeting/allocationMeetingTime',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            };

            let data = {
              id: id,
              terminalId: res.res[0],
              queueId: res.res[1],
              justice: res.res[2]
            };

            logger.debug(data);
            httpUtils.sendRequest(options, data, function (err, res) {
              logger.debug(data);
              if (err) logger.error(err);
              else logger.debug(res);
            });
          } else {
            logger.debug(`code: ${res.code}`);
          }
        });

      }, { noAck: true });
    });

    return ok.then(function (_consumeOk) {
      logger.debug(' [*] Waiting for messages. To exit press CTRL+C');
    });

  });
}).then(null, console.warn);

