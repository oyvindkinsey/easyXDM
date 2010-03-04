/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

(function(){
    /**
     * @class easyXDM.transport.HashTransport
     * HashTransport is a transport class that uses the IFrame URL Technique for communication.<br/>
     * <a href="http://msdn.microsoft.com/en-us/library/bb735305.aspx">http://msdn.microsoft.com/en-us/library/bb735305.aspx</a><br/>
     * This requires the precense of hash.html on the hosting domain for optimal performance, but can also be used with any other
     * static file present. If used with a static file (like an image) as the local: property, you must set the readyAfter property.<br/>
     * The library will try to be ready earlier, so this should be set to a safe value, when you are certain that the file will be loaded.<br/>
     * If this file is already present in the document, and therefor most likely cached, then this can be set to low value.
     * <br/>
     * The ReliableBehavior, QueueBehavior and VerifyBehavior are applied to this class.
     * @constructor
     * @param {easyXDM.configuration.TransportConfiguration} config The transports configuration.
     * @param {Function} onReady A method that should be called when the transport is ready
     * @cfg {Number} readyAfter The number of milliseconds to wait before firing onReady. To support using passive hash files.
     * @cfg {String/Window} local The url to the local document for calling back, or the local window.
     * @cfg {String} remote The url to the remote document to interface with
     * @cfg {Function} onMessage The method that should handle incoming messages.<br/> This method should accept two arguments, the message as a string, and the origin as a string.
     * @namespace easyXDM.transport
     */
    easyXDM.transport.HashTransport = function(config, onReady){
        var stack, query = easyXDM.Url.Query(), isHost = (typeof query.xdm_p === "undefined"), recipient;
        //set defaults
        if (isHost) {
            recipient = easyXDM.Url.getLocation(config.remote);
        }
        else {
            recipient = easyXDM.Url.getLocation(query.xdm_e);
        }
        
        this.destroy = function(){
            stack.destroy();
        };
        
        this.postMessage = function(message){
            stack.outgoing(message, recipient);
        };
        
        stack = easyXDM.createStack(easyXDM.getTransportBehaviors({
            protocol: "0",
            isHost: isHost,
            channel: config.channel,
            local: config.local,
            remote: config.remote,
            pollInterval: config.pollInterval || 300
        }).concat([{
            incoming: function(message, origin){
                config.onMessage(message, origin);
            },
            callback: function(success){
                if (onReady) {
                    onReady(success);
                }
            }
        }]));
        stack.init();
    };
    
    
    /**
     * Contains the proxy windows used to read messages from remote when
     * using HashTransport.
     * @static
     * @namespace easyXDM.transport
     */
    easyXDM.transport.HashTransport.windows = {};
    
    /**
     * Notify that a channel is ready and register a window to be used for reading messages
     * for on the channel.
     * @static
     * @param {String} channel
     * @param {Window} contentWindow
     * @namespace easyXDM.transport
     */
    easyXDM.transport.HashTransport.channelReady = function(channel, contentWindow){
        var ht = easyXDM.transport.HashTransport;
        ht.windows[channel] = contentWindow;
        // #ifdef debug
        easyXDM.Debug.trace("executing onReady callback for channel " + channel);
        // #endif
        easyXDM.Fn.get(channel, true)();
    };
    
    /**
     * Returns the window associated with a channel
     * @static
     * @param {String} channel
     * @return {Window} The window
     * @namespace easyXDM.transport
     */
    easyXDM.transport.HashTransport.getWindow = function(channel){
        return easyXDM.transport.HashTransport.windows[channel];
    };
}());
