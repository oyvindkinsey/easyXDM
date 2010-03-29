/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape , defer */

/**
 * @class easyXDM.stack.QueueBehavior
 * This is a behavior that enables queueing of messages. <br/>
 * It will buffer incoming messages and dispach these as fast as the underlying transport allows.
 * This will also fragment/defragment messages so that the outgoing message is never bigger than the
 * set length.
 * @extends easyXDM.stack.StackElement
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The behaviors configuration. Optional.
 * @cfg {Number} maxLength The maximum length of each outgoing message. Set this to enable fragmentation.
 */
easyXDM.stack.QueueBehavior = function(config){
    // #ifdef debug
    var trace = easyXDM.Debug.getTracer("easyXDM.stack.QueueBehavior");
    trace("constructor");
    // #endif
    var pub, queue = [], waiting = false, incoming = "", destroying, maxLength = (config) ? config.maxLength : 0, encode = (config) ? (config.encode || false) : false;
    
    function dispatch(){
        if (waiting || queue.length === 0 || destroying) {
            return;
        }
        // #ifdef debug
        trace("dispatching from queue");
        // #endif
        waiting = true;
        var message = queue.shift();
        
        pub.down.outgoing(message.data, message.origin, function(success){
            waiting = false;
            if (message.callback) {
                defer(function(){
                    message.callback(success);
                });
            }
            dispatch();
        });
    }
    return (pub = {
        incoming: function(message, origin){
            var indexOf = message.indexOf("_"), seq = parseInt(message.substring(0, indexOf), 10);
            incoming += message.substring(indexOf + 1);
            if (seq === 0) {
                // #ifdef debug
                trace("received the last fragment");
                // #endif
                if (encode) {
                    incoming = decodeURIComponent(incoming);
                }
                pub.up.incoming(incoming, origin);
                incoming = "";
            }
            // #ifdef debug
            else {
                trace("waiting for more fragments, seq=" + message);
            }
            // #endif
        },
        outgoing: function(message, origin, fn){
            if (encode) {
                message = encodeURIComponent(message);
            }
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
                trace("enqueuing");
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
            trace("destroy");
            // #endif
            destroying = true;
            pub.down.destroy();
        }
    });
};
