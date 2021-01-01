var Handlers = function () {
    this.handles = {};
};

Handlers.prototype.subscribe = function (topic, handler) {
    this.handles[topic] = this.handles[topic] || [];
    this.handles[topic].push(handler);
    return { 
        unsubscribe: () => { 
            this.unsubscribe(topic); 
        } 
    };
};

Handlers.prototype.unsubscribe = function (topic) {
    delete this.handles[topic];
};

Handlers.prototype.publish = function (topic, raw, onPublish) {
    if(this.handles[topic]) {
        for (var index = 0; index < this.handles[topic].length; index++) {
            this.handles[topic][index](raw);
        }
        onPublish({activated:true});
    }
};

var handlers = global.handlers = (global.handlers || new Handlers());

module.exports = handlers;