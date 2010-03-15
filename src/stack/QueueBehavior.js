/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/**
 * @class easyXDM.stack.QueueBehavior
 * This is a behavior that enables queueing of messages. <br/>
 * It will buffer incoming messages and will dispach these as fast as the underlying transport allows.
 * This will also fragment/defragment messages so that the outgoing message is never bigger than the
 * set length.
 * @constructor
 * @param {Object} settings
 * @cfg {Number} maxLength The maximum length of each outgoing message. Set this to enable fragmentation.
 * @namespace easyXDM.stack
 */
easyXDM.stack.QueueBehavior = function(settings){
    var pub, queue = [], waiting = false, incoming = "", destroying, maxLength = (settings) ? settings.maxLength : 0;
    
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
        incoming: function(message, origin){
            var indexOf = message.indexOf("_"), seq = parseInt(message.substring(0, indexOf), 10);
            incoming += message.substring(indexOf + 1);
            if (seq === 0) {
                // #ifdef debug
                easyXDM.Debug.trace("last fragment received");
                // #endif
                pub.up.incoming(incoming, origin);
                incoming = "";
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
            pub.down.destroy();
        }
    });
};
