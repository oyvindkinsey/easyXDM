/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/**
 * @class easyXDM.transport.NameTransport
 * NameTransport uses the window.name property to relay data - this means it can transport large amounts of data
 * @constructor
 * @param {easyXDM.configuration.TransportConfiguration} config The transports configuration.
 * @param {Function} onReady A method that should be called when the transport is ready
 * @cfg {String} local The url to the local instance of hash.html
 * @cfg {String} remote The url to the remote document to interface with
 * @cfg {String} remoteHelper The url to the remote instance of hash.html - this is only needed for the host.
 * @cfg {Function} onMessage The method that should handle incoming messages.<br/> This method should accept two arguments, the message as a string, and the origin as a string.
 * @namespace easyXDM.transport
 */
easyXDM.transport.NameTransport = function(config, onReady){
    var me = this;
    // #ifdef debug
    easyXDM.Debug.trace("easyXDM.transport.NameTransport.constructor");
    // #endif
    // If no protocol is set then it means this is the host
    var query = easyXDM.Url.Query(), isHost = (typeof query.xdm_p === "undefined");
    if (!isHost) {
        config.channel = query.xdm_c;
        config.remote = decodeURIComponent(query.xdm_e);
    }
    var callerWindow, remoteWindow, readyCount = 0, callback;
    var remoteOrigin = easyXDM.Url.getLocation(config.remote), remoteUrl;
    config.local = easyXDM.Url.resolveUrl(config.local);
    
    
    function _sendMessage(message){
        var url = config.remoteHelper + (isHost ? ("#_3" + encodeURIComponent(remoteUrl + "#" + config.channel)) : ("#_2" + config.channel));
        // #ifdef debug
        easyXDM.Debug.trace("sending message " + message);
        easyXDM.Debug.trace("navigating to  '" + url + "'");
        // #endif
        callerWindow.contentWindow.sendMessage(message, url);
    }
    
    function _onReady(){
        if (isHost) {
            if (++readyCount === 2 || !isHost) {
                me.down.callback(true);
            }
        }
        else {
            _sendMessage("ready");
            if (onReady) {
                // #ifdef debug
                easyXDM.Debug.trace("calling onReady");
                // #endif
                me.down.callback(true);
            }
        }
        
    }
    
    function _onMessage(message){
        // #ifdef debug
        easyXDM.Debug.trace("received message " + message);
        // #endif
        me.down.incomming(message, remoteOrigin);
    }
    
    function _onLoad(){
        if (callback) {
            window.setTimeout(function(){
                callback(true);
            }, 0);
        }
    }
    
    if (isHost) {
        // Register the callback
        easyXDM.Fn.set(config.channel, function(message){
            // #ifdef debug
            easyXDM.Debug.trace("received initial message " + message);
            // #endif
            if (isHost && message === "ready") {
                // Replace the handler
                easyXDM.Fn.set(config.channel, _onMessage);
                _onReady();
            }
        });
        
        // Set up the frame that points to the remote instance
        remoteUrl = easyXDM.Url.appendQueryParameters(config.remote, {
            xdm_e: config.local,
            xdm_c: config.channel,
            xdm_p: 2
        });
        
        remoteWindow = easyXDM.DomHelper.createFrame(remoteUrl + '#' + config.channel, config.container, null, config.channel);
    }
    else {
        config.remoteHelper = config.remote;
        easyXDM.Fn.set(config.channel, _onMessage);
    }
    
    /** 
     * Sends a message by placing it in the <code>name</code> property of the callerWindow and then
     * redirecting the window to the remote instance of hash.html.<br/>
     * hash.html will send the document back after having passed on the message.
     * @param {String} message The message to send
     */
    this.postMessage = function(message){
        me.down.outgoing(message, remoteOrigin);
    };
    
    /**
     * Tries to clean up the DOM
     */
    this.destroy = function(){
        // #ifdef debug
        easyXDM.Debug.trace("destroying transport");
        // #endif
        me.down.destroy();
        callerWindow.parentNode.removeChild(callerWindow);
        callerWindow = null;
        if (isHost) {
            remoteWindow.parentNode.removeChild(remoteWindow);
            remoteWindow = null;
        }
    };
    
    this.up = {
        incomming: function(message, origin){
            config.onMessage(message, origin);
        },
        outgoing: function(message, origin, fn){
            callback = fn;
            _sendMessage(message);
        },
        callback: function(succes){
            if (onReady) {
                window.setTimeout(onReady, 10);
            }
        },
        destroy: function(){
        }
    };
    this.down = {
        incomming: function(message, origin){
            this.up.incomming(message, origin);
        },
        outgoing: function(message, origin){
            this.down.outgoing(message, origin);
        },
        callback: function(success){
            this.up.callback(success);
        },
        destroy: function(){
            this.down.destroy();
        }
    };
    easyXDM.applyBehaviors(this, [new easyXDM.transport.behaviors.QueueBehavior(), new easyXDM.transport.behaviors.VerifyBehavior({
        initiate: isHost
    })]);
    // Set up the iframe that will be used for the transport
    callerWindow = easyXDM.DomHelper.createFrame(config.local + "#_4" + config.channel, null, function(){
        // Remove the handler
        easyXDM.DomHelper.removeEventListener(callerWindow, "load", callerWindow.loadFn);
        easyXDM.Fn.set(config.channel + "_load", _onLoad);
        _onReady();
    });
    
};
