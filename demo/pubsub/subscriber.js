var rabbit = require('../../src/index.js');
var fs = require('fs');

rabbit.log(
  { level: 'debug', stream: fs.createWriteStream('./debug-' + Date.now() + '-subscriber.log'), objectMode: true }
);
const counts = {
  timeout: 0, // variable to hold the timeout
  started: 0, // variable to hold starting time
  received: 0, // variable to hold received count
  batch: 500, // expected batch size
  expected: 30000 // expected message count
};

var count = 0;
// always setup your message handlers first

// this handler will handle messages sent from the publisher
rabbit.handle('publisher.message', function (msg) {
  msg.ack();
  if (counts.received % 5000 === 0) {
    report();
  }
  if ((++counts.received) >= counts.expected - 1) {
    var diff = Date.now() - counts.started;
    console.log('Received', counts.received, 'messages after', diff, 'milliseconds');
  }
  
  // First 10k message, we delay they answer from 20s, the rest of the message are answered right away
  count++;
  if(count > 10000) {
    if(msg.properties.messageId) {
      msg.reply({
        contents: "bcf3193a-4df1-4d3e-a6ba-5ff0bddaf785",
        response: "ff0742df-ed5b-4692-a968-5499457450b0",
        sender: "2c3a0ccb-6fe5-4a6f-b50a-1bb00fd1dd36",
        r:true
      });
    } else {
      rabbit.publish('wascally-pubsub-requests-x', {
        type: 'subscriber.request',
        routingKey: '',
        body: {
          contents: "bcf3193a-4df1-4d3e-a6ba-5ff0bddaf785",
          response: "ff0742df-ed5b-4692-a968-5499457450b0",
          sender: "2c3a0ccb-6fe5-4a6f-b50a-1bb00fd1dd36",
          r:true
        }
      });
    }
  } else {
    setTimeout(() => {
      if(msg.properties.messageId) {
        msg.reply({
          contents: "bcf3193a-4df1-4d3e-a6ba-5ff0bddaf785",
          response: "ff0742df-ed5b-4692-a968-5499457450b0",
          sender: "2c3a0ccb-6fe5-4a6f-b50a-1bb00fd1dd36",
          r:true
        });
      } else {
        rabbit.publish('wascally-pubsub-requests-x', {
          type: 'subscriber.request',
          routingKey: '',
          body: {
            contents: "bcf3193a-4df1-4d3e-a6ba-5ff0bddaf785",
            response: "ff0742df-ed5b-4692-a968-5499457450b0",
            sender: "2c3a0ccb-6fe5-4a6f-b50a-1bb00fd1dd36",
            r:true
          }
        });
      }
    }, 20000);
  }
});

function report () {
  var diff = Date.now() - counts.started;
  console.log('Received', counts.received, 'messages after', diff, 'milliseconds');
}

// it can make a lot of sense to share topology definition across
// services that will be using the same topology to avoid
// scenarios where you have race conditions around when
// exchanges, queues or bindings are in place
require('./topology.js')(rabbit, 'messages')
  .then(() => {
    notifyPublisher();
  });

// now that our handlers are set up and topology is defined,
// we can publish a request to let the publisher know we're up
// and ready for messages.

// because we will re-publish after a timeout, the messages will
// expire if not picked up from the queue in time.
// this prevents a bunch of requests from stacking up in the request
// queue and causing the publisher to send multiple bundles
var requestCount = 0;

function notifyPublisher () {
  console.log('Sending request', ++requestCount);
  rabbit.request('wascally-pubsub-requests-x', {
    type: 'subscriber.request',
    replyTimeout: 15000,
    expiresAfter: 6000,
    routingKey: '',
    body: { ready: true, expected: counts.expected, batchSize: counts.batch }
  }).then(function (response) {
    // if we get a response, cancel any existing timeout
    counts.received = 0;
    counts.started = Date.now();
    if (counts.timeout) {
      clearTimeout(counts.timeout);
    }
    console.log('Publisher replied.');
    response.ack();
  });
  counts.timeout = setTimeout(notifyPublisher, 15000);
}
