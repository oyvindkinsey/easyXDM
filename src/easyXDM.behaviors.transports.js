/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

easyXDM.behaviors = {};
/**
 * The namespace for the transports
 */
easyXDM.behaviors.transports = {};

/**
 *
 * @param {Object} config
 * @cfg {Boolean} isHost
 * @cfg {String} channel
 * @cfg {String} remote
 */
easyXDM.behaviors.transports.PostMessageBehavior = function(config){
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
            return easyXDM.Url.getLocation(event.uri);
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
        easyXDM.Debug.trace("received message '" + event.data + "' from " + origin);
        // #endif
        if (origin == targetOrigin && event.data.substring(0, config.channel.length + 1) == config.channel + " ") {
            pub.up.incoming(event.data.substring(config.channel.length + 1), origin);
        }
    }
    
    // #ifdef debug
    easyXDM.Debug.trace("easyXDM.transport.PostMessageTransport.constructor");
    // #endif
    if (!window.postMessage) {
        throw new Error("This browser does not support window.postMessage");
    }
    
    return (pub = {
        outgoing: function(message, domain, fn){
            callerWindow.postMessage(config.channel + " " + message, domain);
        },
        destroy: function(){
            // #ifdef debug
            easyXDM.Debug.trace("destroying transport");
            // #endif
            easyXDM.DomHelper.removeEventListener(window, "message", _window_onMessage);
            if (frame) {
                callerWindow=null;
				frame.parentNode.removeChild(frame);
				frame = null;
            }
        },
        init: function(){
            targetOrigin = easyXDM.Url.getLocation(config.remote);
            if (config.isHost) {
                // add the event handler for listening
                easyXDM.DomHelper.addEventListener(window, "message", function waitForReady(event){
                    if (event.data == config.channel + "-ready") {
                        // #ifdef debug
                        easyXDM.Debug.trace("firing onReady");
                        // #endif
                        // replace the eventlistener
                        easyXDM.DomHelper.removeEventListener(window, "message", waitForReady);
                        easyXDM.DomHelper.addEventListener(window, "message", _window_onMessage);
                        window.setTimeout(function(){
                            pub.up.callback(true);
                        }, 0);
                    }
                });
                // set up the iframe
                frame = easyXDM.DomHelper.createFrame(easyXDM.Url.appendQueryParameters(config.remote, {
                    xdm_e: location.protocol + "//" + location.host,
                    xdm_c: config.channel,
                    xdm_p: 1 // 1 = PostMessage
                }), config.container, function(contentWindow){
                    callerWindow = contentWindow;
                });
            }
            else {
                // add the event handler for listening
                easyXDM.DomHelper.addEventListener(window, "message", _window_onMessage);
                callerWindow = window.parent;
                callerWindow.postMessage(config.channel + "-ready", targetOrigin);
                window.setTimeout(function(){
                    pub.up.callback(true);
                }, 0);
            }
        }
    });
};
