/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/**
 * @class easyXDM.transport.PostMessageTransport
 * PostMessageTransport is a transport class that uses HTML5 postMessage for communication
 * <a href="http://msdn.microsoft.com/en-us/library/ms644944(VS.85).aspx">http://msdn.microsoft.com/en-us/library/ms644944(VS.85).aspx</a>
 * <a href="https://developer.mozilla.org/en/DOM/window.postMessage">https://developer.mozilla.org/en/DOM/window.postMessage</a>
 * @constructor
 * @param {easyXDM.configuration.TransportConfiguration} config The transports configuration.
 * @param {Function} onReady A method that should be called when the transport is ready
 * @cfg {Mixed} local Any value that will evaluate as True
 * @cfg {String} remote The url to the remote document to interface with
 * @cfg {String} channel The name of the channel to use
 * @cfg {Function} onMessage The method that should handle incoming messages.<br/> This method should accept two arguments, the message as a string, and the origin as a string.
 * @namespace easyXDM.transport
 */
easyXDM.transport.PostMessageTransport = function(config, onReady){
    // If no protocol is set then it means this is the host
    var stack, query = easyXDM.Url.Query(), isHost = (typeof query.xdm_p === "undefined"), recipient;
    if (!isHost) {
        config.channel = query.xdm_c;
        config.remote = decodeURIComponent(query.xdm_e);
    }
    recipient = easyXDM.Url.getLocation(config.remote);
    
    this.destroy = function(){
        stack.destroy();
    };
    
    this.postMessage = function(message){
        stack.outgoing(message, recipient);
    };
    
    stack = easyXDM.createStack([new easyXDM.behaviors.transports.PostMessageBehavior({
        isHost: isHost,
        channel: config.channel,
        remote: config.remote
    }), {
        incoming: function(message, origin){
            config.onMessage(message, origin);
        },
        callback: function(success){
            if (onReady) {
                onReady(success);
            }
        }
    }]);
    stack.init();
};
