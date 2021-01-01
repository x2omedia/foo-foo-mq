const TESTING_REQUEST = true;
let start = 0;
var rabbit = require('../../src/index.js');
var fs = require('fs');
var receivedBack = 0;

rabbit.log(
  { level: 'debug', stream: fs.createWriteStream('./debug-' + Date.now() + '-publisher.log'), objectMode: true }
);
// always setup your message handlers first

// this handler will respond to the subscriber request and trigger
// sending a bunch of messages
rabbit.handle('subscriber.request', function (msg) {
  if(msg.body.r) {
    receivedBack++;
    if(receivedBack % 500 === 0) {
      console.log((Date.now() - start) + ` just received ${receivedBack} callback using PUBLISH...`);
    }
  } else {
    console.log('Got subscriber request');
    // replying to the message also ack's it to the queue
    msg.reply({ getReady: 'forawesome' }, 'publisher.response');
    start = Date.now();
    setTimeout(() => publish(msg.body.batchSize, msg.body.expected), 0);
  }
});

// it can make a lot of sense to share topology definition across
// services that will be using the same topology to avoid
// scenarios where you have race conditions around when
// exchanges, queues or bindings are in place
require('./topology.js')(rabbit, 'requests')
  .then(function (x) {
    console.log('ready');
  });

rabbit.on('unreachable', function () {
  console.log(':(');
  process.exit();
});

function publish (batchSize, total) {
  var subtotal = total;
  if (total > batchSize) {
    subtotal = batchSize;
  }
  var pending = new Array(subtotal);
  total -= subtotal;
  var lost = 0;
  const publish_fct = (TESTING_REQUEST? rabbit.request:rabbit.publish).bind(rabbit);
  for (let i = 0; i < subtotal; i++) {
    pending.push(
      publish_fct('wascally-pubsub-messages-x', {
        type: 'publisher.message',
        replyTimeout: 360000,
        expiresAfter: 360000,
        body: { message: `Message ${i}` }
      }).then(
        response => {
          if(!response) {
            return;
          }
          receivedBack++;
          if(receivedBack % 500 === 0) {
            console.log((Date.now() - start) + ` just received ${receivedBack} callback using REQUEST...`);
          }
          response.ack();
        },
        (e) => {
          lost++;
          throw e;
        }
      )
    );
  }
  if (total > 0) {
    setTimeout(() => publish(batchSize, total), 1);
    console.log((Date.now() - start) + ` publishing ${batchSize} messages, message left to publish ${total}`);
    Promise.all(pending)
      .then(() => {
        //console.log((Date.now() - start) + ` just published ${batchSize} messages, message left to publish ${total}`);
        //setTimeout(() => publish(batchSize, total), 0);
      },
      () => {
        console.log(`${lost} MESSAGES LOST!`);
        //setTimeout(() => publish(batchSize, total), 0);
      });
  }
}
