/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/**
 * The namespace for the transports
 */
easyXDM.transport = {};

/**
 * The namespace for the transport behaviors
 */
easyXDM.transport.behaviors = {};

/**
 * @class easyXDM.transport.behaviors.ReliableBehavior
 * This is a behavior that tries to make the underlying transport reliable by using acknowledgements.
 * @param {Object} settings
 * @cfg {Number} timeout How long it should wait before resending
 * @cfg {Number} tries How many times it should try before giving up
 * @namespace easyXDM.transport.behaviors
 */
easyXDM.transport.behaviors.ReliableBehavior = function(settings){
    var pub, // the public interface
 timer, // timer to wait for acks
 current, // the current message beging sent
 next, // the next message to be sent, to support piggybacking acks
 sendId = 0, // the id of the last message sent
 sendCount = 0, // how many times we hav tried resending
 maxTries = settings.tries || 5, timeout = settings.timeout, //
 receiveId = 0, // the id of the last message received
 callback; // the callback to execute when we have a confirmed success/failure
    // #ifdef debug
    easyXDM.Debug.trace("ReliableBehavior: settings.timeout=" + settings.timeout);
    easyXDM.Debug.trace("ReliableBehavior: settings.tries=" + settings.tries);
    // #endif
    return (pub = {
        incomming: function(message, origin){
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
                        pub.up.incomming(message, origin);
                    }, settings.timeout / 2);
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
                    timer = window.setTimeout(send, settings.timeout);
                }
            }());
        },
        destroy: function(){
            if (timer) {
                window.clearInterval(timer);
            }
            pub.up.destroy();
        },
        callback: function(success){
            pub.up.callback(success);
        }
    });
};

/**
 * @class easyXDM.transport.behaviors.QueueBehavior
 * This is a behavior that enables queueing of messages. <br/>
 * It will buffer incomming messages and will dispach these as fast as the underlying transport allows.
 * This will also fragment/defragment messages so that the outgoing message is never bigger than the
 * set length.
 * @param {Object} settings
 * @cfg {Number} maxLength The maximum length of each outgoing message. Set this to enable fragmentation.
 * @namespace easyXDM.transport.behaviors
 */
easyXDM.transport.behaviors.QueueBehavior = function(settings){
    var pub, queue = [], waiting = false, incomming = "", destroying, maxLength = settings.maxLength;
    
    function dispatch(){
        if (waiting || queue.length === 0 || destroying) {
            return;
        }
        // #ifdef debug
        easyXDM.Debug.trace("dispatching from queue");
        // #endif
        waiting = true;
        var message = queue.shift();
        
        pub.down.outgoing(message.data, message.origin, function(success){
            waiting = false;
            if (message.callback) {
                window.setTimeout(function(){
                    message.callback(success);
                }, 0);
            }
            dispatch();
        });
    }
    return (pub = {
        incomming: function(message, origin){
            var indexOf = message.indexOf("_"), seq = parseInt(message.substring(0, indexOf), 10);
            incomming += message.substring(indexOf + 1);
            if (seq === 0) {
                // #ifdef debug
                easyXDM.Debug.trace("last fragment received");
                // #endif
                pub.up.incomming(incomming, origin);
                incomming = "";
            }
            // #ifdef debug
            else {
                easyXDM.Debug.trace("awaiting more fragments, seq=" + message);
            }
            // #endif
        },
        outgoing: function(message, origin, fn){
            var fragments = [], fragment;
            if (maxLength) {
                while (message.length !== 0) {
                    fragment = message.substring(0, maxLength);
                    message = message.substring(fragment.length);
                    fragments.push(fragment);
                }
            }
            else {
                fragments.push(message);
            }
            while ((fragment = fragments.shift())) {
                // #ifdef debug
                easyXDM.Debug.trace("enqueuing");
                // #endif
                queue.push({
                    data: fragments.length + "_" + fragment,
                    origin: origin,
                    callback: fragments.length === 0 ? fn : null
                });
            }
            dispatch();
        },
        destroy: function(){
            // #ifdef debug
            easyXDM.Debug.trace("QueueBehavior#destroy");
            // #endif
            destroying = true;
            pub.up.destroy();
        },
        callback: function(success){
            pub.up.callback(success);
        }
    });
};

/**
 * @class easyXDM.transport.behaviors.VerifyBehavior
 * This behavior will verify that communication with the remote end is possible, and will also sign all outgoing,
 * and verify all incomming messages. This removes the risk of someone hijacking the iframe to send malicious messages.
 * @param {Object} settings
 * @cfg {Boolean} initiate If the verification should be initiated from this end.
 * @namespace easyXDM.transport.behaviors
 */
easyXDM.transport.behaviors.VerifyBehavior = function(settings){
    var pub, mySecret, theirSecret, verified = false;
    if (typeof settings.initiate === "undefined") {
        throw new Error("settings.initiate is not set");
    }
    function startVerification(){
        // #ifdef debug
        easyXDM.Debug.trace("VerifyBehavior: requesting verification");
        // #endif
        mySecret = Math.random().toString(16).substring(2);
        pub.down.outgoing(mySecret);
    }
    
    return (pub = {
        incomming: function(message, origin){
            var indexOf = message.indexOf("_");
            if (indexOf === -1) {
                if (message === mySecret) {
                    // #ifdef debug
                    easyXDM.Debug.trace("VerifyBehavior: verified, calling callback");
                    // #endif
                    pub.up.callback(true);
                }
                else if (!theirSecret) {
                    // #ifdef debug
                    easyXDM.Debug.trace("VerifyBehavior: returning secret");
                    // #endif
                    theirSecret = message;
                    if (!settings.initiate) {
                        startVerification();
                    }
                    pub.down.outgoing(message);
                }
            }
            else {
                if (message.substring(0, indexOf) === theirSecret) {
                    // #ifdef debug
                    easyXDM.Debug.trace("VerifyBehavior: valid");
                    // #endif
                    pub.up.incomming(message.substring(indexOf + 1), origin);
                }
                // #ifdef debug
                else {
                    easyXDM.Debug.trace("VerifyBehavior: invalid secret:" + message.substring(0, indexOf) + ", was expecting:" + theirSecret);
                    
                }
                // #endif
            }
            
        },
        outgoing: function(message, origin, fn){
            pub.down.outgoing(mySecret + "_" + message, origin, fn);
        },
        destroy: function(){
            pub.up.destroy();
        },
        callback: function(success){
            if (settings.initiate) {
                startVerification();
            }
        }
    });
};
