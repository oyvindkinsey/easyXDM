/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/**
 * @class easyXDM.stack.ReliableBehavior
 * This is a behavior that tries to make the underlying transport reliable by using acknowledgements.
 * @extends easyXDM.stack.StackElement
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The behaviors configuration.
 * @cfg {Number} timeout How long it should wait before resending. Default is 5. Optional.
 * @cfg {Number} tries How many times it should try before giving up.
 */
easyXDM.stack.ReliableBehavior = function(config){
    var pub, // the public interface
 timer, // timer to wait for acks
 current, // the current message beging sent
 next, // the next message to be sent, to support piggybacking acks
 sendId = 0, // the id of the last message sent
 sendCount = 0, // how many times we hav tried resending
 maxTries = config.tries || 5, timeout = config.timeout, //
 receiveId = 0, // the id of the last message received
 callback; // the callback to execute when we have a confirmed success/failure
    return (pub = {
        incoming: function(message, origin){
            var indexOf = message.indexOf("_"), ack = parseInt(message.substring(0, indexOf), 10), id;
            // #ifdef debug
            easyXDM.Debug.trace("ReliableBehavior: received ack: " + ack + ", last sent was: " + sendId);
            // #endif
            message = message.substring(indexOf + 1);
            indexOf = message.indexOf("_");
            id = parseInt(message.substring(0, indexOf), 10);
            indexOf = message.indexOf("_");
            message = message.substring(indexOf + 1);
            // #ifdef debug
            easyXDM.Debug.trace("ReliableBehavior: lastid " + receiveId + ", this " + id);
            // #endif
            if (timer && ack === sendId) {
                window.clearTimeout(timer);
                timer = null;
                // #ifdef debug
                easyXDM.Debug.trace("ReliableBehavior: message delivered");
                // #endif
                if (callback) {
                    window.setTimeout(function(){
                        callback(true);
                    }, 0);
                }
            }
            if (id !== 0) {
                if (id !== receiveId) {
                    receiveId = id;
                    message = message.substring(id.length + 1);
                    // #ifdef debug
                    easyXDM.Debug.trace("ReliableBehavior: sending ack, passing on " + message);
                    // #endif
                    pub.down.outgoing(id + "_0_ack", origin);
                    // we must give the other end time to pick up the ack
                    window.setTimeout(function(){
                        pub.up.incoming(message, origin);
                    }, config.timeout / 2);
                }
                // #ifdef debug
                else {
                    easyXDM.Debug.trace("ReliableBehavior: duplicate msgid " + id + ", resending ack");
                    pub.down.outgoing(id + "_0_ack", origin);
                }
                // #endif
            }
        },
        outgoing: function(message, origin, fn){
            callback = fn;
            sendCount = 0;
            current = {
                data: receiveId + "_" + (++sendId) + "_" + message,
                origin: origin
            };
            
            // Keep resending until we have an ack
            (function send(){
                timer = null;
                if (++sendCount > maxTries) {
                    if (callback) {
                        // #ifdef debug
                        easyXDM.Debug.trace("ReliableBehavior: delivery failed");
                        // #endif
                        window.setTimeout(function(){
                            callback(false);
                        }, 0);
                    }
                }
                else {
                    // #ifdef debug
                    easyXDM.Debug.trace("ReliableBehavior: " + (sendCount === 1 ? "sending " : "resending ") + sendId + ", tryCount " + sendCount);
                    // #endif
                    pub.down.outgoing(current.data, current.origin);
                    timer = window.setTimeout(send, config.timeout);
                }
            }());
        },
        destroy: function(){
            if (timer) {
                window.clearInterval(timer);
            }
            pub.down.destroy();
        }
    });
};
