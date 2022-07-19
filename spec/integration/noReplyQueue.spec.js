require('../setup');
const rabbit = require('../../src/index.js');
const config = require('./configuration');

function stallLongEnoughToARegisterMessages () {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
}

describe('No Reply Queue (replyQueue: false)', function () {
  let messagesToSend;
  let harness;

  before(function (done) {
    harness = harnessFactory(rabbit, done, messagesToSend);
    rabbit.configure({
      connection: config.noReplyQueue,
      exchanges: [
        {
          name: 'noreply-ex.direct',
          type: 'direct',
          autoDelete: true
        }
      ],
      queues: [
        {
          name: 'noreply-q.direct',
          autoDelete: true,
          subscribe: true
        }
      ],
      bindings: [
        {
          exchange: 'noreply-ex.direct',
          target: 'noreply-q.direct',
          keys: ''
        }
      ]
    }).then(() => {
      messagesToSend = 3;
      harness.handle('no.replyQueue');
      for (let i = 0; i < messagesToSend; i++) {
        rabbit.publish('noreply-ex.direct', {
          connectionName: 'noReplyQueue',
          type: 'no.replyQueue',
          body: 'message ' + i,
          routingKey: ''
        });
      }
      return stallLongEnoughToARegisterMessages();
    });
  });

  it('should receive all messages', function () {
    harness.received.length.should.equal(messagesToSend);
  });

  after(function () {
    return harness.clean('noReplyQueue');
  });
});
