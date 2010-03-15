/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/**
 * @class easyXDM.stack.NameTransport
 * NameTransport uses the window.name property to relay data.
 * The <code>local</code> parameter needs to be set on both the consumer and provider,<br/>
 * and the <code>remoteHelper</code> parameter needs to be set on the consumer.
 * @extends easyXDM.stack.TransportStackElement
 * @constructor
 * @param {Object} config The transports configuration.
 * @cfg {String} remoteHelper The url to the remote instance of hash.html - this is only needed for the host.
 * @namespace easyXDM.stack
 */
easyXDM.stack.NameTransport = function(config){
    var pub; // the public interface
    var isHost, callerWindow, remoteWindow, readyCount, callback, remoteOrigin, remoteUrl;
    // #ifdef debug
    easyXDM.Debug.trace("easyXDM.transport.NameTransport.constructor");
    // #endif
    
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
                pub.up.callback(true);
            }
        }
        else {
            _sendMessage("ready");
            // #ifdef debug
            easyXDM.Debug.trace("calling onReady");
            // #endif
            pub.up.callback(true);
        }
    }
    
    function _onMessage(message){
        // #ifdef debug
        easyXDM.Debug.trace("received message " + message);
        // #endif
        pub.up.incoming(message, remoteOrigin);
    }
    
    function _onLoad(){
        if (callback) {
            window.setTimeout(function(){
                callback(true);
            }, 0);
        }
    }
    
    return (pub = {
        outgoing: function(message, domain, fn){
            callback = fn;
            _sendMessage(message);
        },
        destroy: function(){
            callerWindow.parentNode.removeChild(callerWindow);
            callerWindow = null;
            if (isHost) {
                remoteWindow.parentNode.removeChild(remoteWindow);
                remoteWindow = null;
            }
        },
        init: function(){
            // #ifdef debug
            easyXDM.Debug.trace("NameTransport#init");
            // #endif
            isHost = config.isHost;
            readyCount = 0;
            remoteOrigin = easyXDM.Url.getLocation(config.remote);
            config.local = easyXDM.Url.resolveUrl(config.local);
            
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
            // Set up the iframe that will be used for the transport
            callerWindow = easyXDM.DomHelper.createFrame(config.local + "#_4" + config.channel, null, function(){
                // Remove the handler
                easyXDM.DomHelper.un(callerWindow, "load", callerWindow.loadFn);
                easyXDM.Fn.set(config.channel + "_load", _onLoad);
                _onReady();
            });
        }
    });
};
