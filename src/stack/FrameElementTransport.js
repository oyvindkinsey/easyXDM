/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, getLocation, appendQueryParameters, createFrame, debug, apply, query*/

/**
 * @class easyXDM.stack.FrameElementTransport
 * FrameElementTransport is a transport class that can be used with Gecko-browser as these allow passing variables using the frameElement property.<br/>
 * Security is maintained as Gecho uses Lexical Authorization to determine under which scope a function is running.
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The transports configuration.
 * @cfg {String} remote The remote document to communicate with.
 */
easyXDM.stack.FrameElementTransport = function(config){
    // #ifdef debug
    var trace = debug.getTracer("easyXDM.stack.FrameElementTransport");
    trace("constructor");
    // #endif
    var pub, frame, send, targetOrigin;
    
    return (pub = {
        outgoing: function(message, domain, fn){
            send.call(this, message);
            if (fn) {
                fn();
            }
        },
        destroy: function(){
            // #ifdef debug
            trace("destroy");
            // #endif
            if (frame) {
                frame.parentNode.removeChild(frame);
                frame = null;
            }
        },
        init: function(){
            // #ifdef debug
            trace("init");
            // #endif
            targetOrigin = getLocation(config.remote);
            
            if (config.isHost) {
                // set up the iframe
                apply(config.props, {
                    src: appendQueryParameters(config.remote, {
                        xdm_e: location.protocol + "//" + location.host + location.pathname,
                        xdm_c: config.channel,
                        xdm_p: 5 // 5 = FrameElementTransport
                    })
                });
                frame = createFrame(config);
                frame.fn = function(sendFn){
                    send = sendFn;
                    pub.up.callback(true);
                    // remove the function so that it cannot be used to overwrite the send function later on
                    delete frame.fn;
                    return function(msg){
                        pub.up.incoming(msg, targetOrigin);
                    };
                };
            }
            else {
                if (document.referrer && document.referrer != query.xdm_e) {
                    window.parent.location = query.xdm_e;
                }
                else {
                    if (document.referrer != query.xdm_e) {
                        // This is to mitigate origin-spoofing
                        window.parent.location = query.xdm_e;
                    }
                    send = window.frameElement.fn(function(msg){
                        pub.up.incoming(msg, targetOrigin);
                    });
                    pub.up.callback(true);
                }
            }
        }
    });
};