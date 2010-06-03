/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, getLocation, appendQueryParameters, createFrame, debug, un, on*/

/**
 * @class easyXDM.stack.PostMessageTransport
 * PostMessageTransport is a transport class that uses HTML5 postMessage for communication.<br/>
 * <a href="http://msdn.microsoft.com/en-us/library/ms644944(VS.85).aspx">http://msdn.microsoft.com/en-us/library/ms644944(VS.85).aspx</a><br/>
 * <a href="https://developer.mozilla.org/en/DOM/window.postMessage">https://developer.mozilla.org/en/DOM/window.postMessage</a>
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The transports configuration.
 * @cfg {String} remote The remote domain to communicate with.
 */
easyXDM.stack.PostMessageTransport = function(config){
    // #ifdef debug
    var trace = debug.getTracer("easyXDM.stack.PostMessageTransport");
    trace("constructor");
    // #endif
    var pub, // the public interface
 frame, // the remote frame, if any
 callerWindow, // the window that we will call with
 targetOrigin; // the domain to communicate with
    /**
     * Resolves the origin from the event object
     * @private
     * @param {Object} event The messageevent
     * @return {String} The scheme, host and port of the origin
     */
    function _getOrigin(event){
        if (event.origin) {
            // This is the HTML5 property
            return event.origin;
        }
        if (event.uri) {
            // From earlier implementations 
            return getLocation(event.uri);
        }
        if (event.domain) {
            // This is the last option and will fail if the 
            // origin is not using the same schema as we are
            return location.protocol + "//" + event.domain;
        }
        throw "Unable to retrieve the origin of the event";
    }
    
    /**
     * This is the main implementation for the onMessage event.<br/>
     * It checks the validity of the origin and passes the message on if appropriate.
     * @private
     * @param {Object} event The messageevent
     */
    function _window_onMessage(event){
        var origin = _getOrigin(event);
        // #ifdef debug
        trace("received message '" + event.data + "' from " + origin);
        // #endif
        if (origin == targetOrigin && event.data.substring(0, config.channel.length + 1) == config.channel + " ") {
            pub.up.incoming(event.data.substring(config.channel.length + 1), origin);
        }
    }
    
    return (pub = {
        outgoing: function(message, domain){
            callerWindow.postMessage(config.channel + " " + message, domain || targetOrigin);
        },
        destroy: function(){
            // #ifdef debug
            trace("destroy");
            // #endif
            un(window, "message", _window_onMessage);
            if (frame) {
                callerWindow = null;
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
                // add the event handler for listening
                on(window, "message", function waitForReady(event){
                    if (event.data == config.channel + "-ready") {
                        // #ifdef debug
                        trace("firing onReady");
                        // #endif
                        // replace the eventlistener
                        callerWindow = frame.contentWindow;
                        un(window, "message", waitForReady);
                        on(window, "message", _window_onMessage);
                        setTimeout(function(){
                            pub.up.callback(true);
                        }, 0);
                    }
                });
                // set up the iframe
                frame = createFrame({
                    prop: {
                        src: appendQueryParameters(config.remote, {
                            xdm_e: location.protocol + "//" + location.host,
                            xdm_c: config.channel,
                            xdm_p: 1 // 1 = PostMessage
                        })
                    },
                    container: config.container
                });
            }
            else {
                // add the event handler for listening
                on(window, "message", _window_onMessage);
                callerWindow = window.parent;
                callerWindow.postMessage(config.channel + "-ready", targetOrigin);
                setTimeout(function(){
                    pub.up.callback(true);
                }, 0);
            }
        }
    });
};
