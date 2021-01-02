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

Handlers.prototype.unsubscribe = function (topic, handler) {
    if(handler) {
        var index = this.handles[topic].indexOf(handler);
        if (index !== -1) {
            this.handles[topic].splice(index, 1);
        }
        if(this.handles[topic].length === 0) {
            delete this.handles[topic];
        }
    } else {
        delete this.handles[topic];
    }
};

Handlers.prototype.publish = function (topic, raw, onPublish) {
    if(this.handles[topic]) {
        for (var index = 0; index < this.handles[topic].length; index++) {
            this.handles[topic][index](raw);
        }
        onPublish({activated:true});
        if(topic.indexOf('req-') === 0) {
            this.unsubscribe(topic);
        }
    }
};

var handlers = global.handlers = (global.handlers || new Handlers());

module.exports = handlers;