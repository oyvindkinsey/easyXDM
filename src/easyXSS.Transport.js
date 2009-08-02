/** 
 * Contains available transport classes
 * @namespace
 */
easyXSS.Transport = {
    /**
     * The configuration for transport classes
     * @class
     */
    TransportConfiguration: {
        /**
         * The url of the remote endpoint
         */
        remote: "",
        /**
         * The url of the local copy of hash.html
         */
        local: "",
        /**
         * The method that should handle incoming messages
         * @param {String} message The message
         * @param {String} origin The origin of the message
         */
        onMessage: function(message, origin){
        
        }
    },
    /**
     * The interface implemented by all transport classes
     */
    ITransport: {
        /**
         * Sends the message
         * @param {String} message The message to send
         * @class
         */
        postMessage: function(message){
        
        },
        /** 
         * Breaks down the connection and tries to clean up the dom.
         */
        destroy: function(){
        
        }
    },
    
    /**
     * PostMessageTransport is a transport class that uses HTML5 postMessage for communication
     * http://msdn.microsoft.com/en-us/library/ms644944(VS.85).aspx
     * https://developer.mozilla.org/en/DOM/window.postMessage
     * @param {easyXSS.Transport.TransportConfiguration} config The transports configuration.
     * @class
     */
    PostMessageTransport: function(config){
        // #ifdef debug
        easyXSS.Debug.trace("easyXSS.Transport.PostMessageTransport.constructor");
        // #endif
        var _targetOrigin = easyXSS.Url.getLocation(config.remote);
        var _callerWindow;
        function _getOrigin(event){
            /// <summary>
            /// The origin property should be valid, but some clients
            /// still uses the uri or domain property.
            /// </summary
            /// <param name="event" type="MessageEvent">The eventobject from the browser</param>
            /// <returns type="string">The origin of the event</returns>
            if (event.origin) {
                return event.origin;
            }
            if (event.uri) {
                return easyXSS.Url.getLocation(event.uri);
            }
            if (event.domain) {
                // This will fail if the origin is not using the same
                // schema as we are
                return location.protocol + "//" + event.domain;
            }
            throw "Unable to retrieve the origin of the event";
        }
        
        function _window_onMessage(event){
            /// <summary>
            /// The handler for the "message" event.
            /// If the origin is allowed then we relay the message to the receiver
            /// </summary
            /// <param name="event" type="MessageEvent">The eventobject from the browser</param>
            var origin = _getOrigin(event);
            // #ifdef debug
            easyXSS.Debug.trace("received message '" + event.data + "' from " + origin);
            // #endif
            if (origin == _targetOrigin && event.data.substring(0, config.channel.length + 1) == config.channel + " ") {
                config.onMessage(event.data.substring(config.channel.length + 1), origin);
            }
        }
        
        function _onReady(){
            /// <summary>
            /// Calls the supplied onReady method
            /// </summary
            /// <remark>
            /// We delay this so that the the call to createChannel or 
            /// createTransport will have completed  
            /// </remark>
            if (config.onReady) {
                window.setTimeout(config.onReady, 10);
            }
        }
        
        if (config.local) {
            if (config.local.substring(0, 1) == "/") {
                config.local = location.protocol + "//" + location.host + config.local;
            }
            _callerWindow = easyXSS.DomHelper.createFrame(config.remote + "?endpoint=" + config.local + "&channel=" + config.channel, "", config.container, function(win){
                _onReady();
            });
        }
        else {
            _onReady();
        }
        easyXSS.DomHelper.addEventListener(window, "message", _window_onMessage);
        
        return {
            /** 
             * Sends the message using the postMethod method available on the window object
             * @param {String} message The message to send
             */
            postMessage: function(message){
                // #ifdef debug
                easyXSS.Debug.trace("sending message '" + message + "' to " + _targetOrigin);
                // #endif
                if (config.local) {
                    _callerWindow.contentWindow.postMessage(config.channel + " " + message, _targetOrigin);
                }
                else {
                    window.parent.postMessage(config.channel + " " + message, _targetOrigin);
                }
            },
            /**
             *
             */
            destroy: function(){
                // #ifdef debug
                easyXSS.Debug.trace("destroying transport");
                // #endif
                easyXSS.DomHelper.removeEventListener(window, "message", _window_onMessage);
                if (config.local) {
                    _callerWindow.parentNode.removeChild(_callerWindow);
                    _callerWindow = null;
                }
            }
        };
    },
    /**
     * HashTransport is a transport class that uses the IFrame URL Technique for communication
     * <a href="http://msdn.microsoft.com/en-us/library/bb735305.aspx">http://msdn.microsoft.com/en-us/library/bb735305.aspx</a>
     * @param {easyXSS.Transport.TransportConfiguration} config The transports configuration.
     * @constructor
     */
    HashTransport: function(config){
        // #ifdef debug
        easyXSS.Debug.trace("easyXSS.Transport.PostMessageTransport.constructor");
        // #endif
        var _timer = null;
        var _lastMsg = "#" + config.channel, _msgNr = 0;
        var _listenerWindow = (!config.local) ? window : null, _callerWindow;
        if (config.local && config.local.substring(0, 1) == "/") {
            config.local = location.protocol + "//" + location.host + config.local;
        }
        var _remoteUrl = config.remote + ((config.local) ? "?endpoint=" + config.local + "&channel=" + config.channel : "#" + config.channel);
        var _remoteOrigin = easyXSS.Url.getLocation(config.remote);
        var _pollInterval = (config.interval) ? config.interval : 300;
        
        function _checkForMessage(){
            /// <summary>
            /// Checks location.hash for a new message and relays this to the receiver.
            /// </summary
            /// <remark>
            /// We have no way of knowing if messages have passed in between the checks.
            /// We could possibly device a way of reporting back the message number read
            /// so that the sender can concatenate multiple messages if previous message
            /// are unread. 
            /// </remark>
            if (!_listenerWindow) {
                // If _listenerWindow is not already set (to window) then we try to attach the 
                // frame located on [remote]. 
                // We need to include the hash part of the url to avoid reloading the frame.
                _listenerWindow = window.open(config.local + "#" + config.channel, "xss_" + config.channel);
            }
            if (_listenerWindow.location.hash && _listenerWindow.location.hash != _lastMsg) {
                _lastMsg = _listenerWindow.location.hash;
                // #ifdef debug
                easyXSS.Debug.trace("received message '" + _lastMsg + "' from " + _remoteOrigin);
                // #endif
                config.onMessage(decodeURIComponent(_lastMsg.substring(_lastMsg.indexOf("_") + 1)), _remoteOrigin);
            }
        }
        
        function _onReady(){
            /// <summary>
            /// Calls the supplied onReady method
            /// </summary
            /// <remark>
            /// We delay this so that the the call to createChannel or 
            /// createTransport will have completed  
            /// </remark>
            _timer = window.setInterval(function(){
                _checkForMessage();
            }, _pollInterval);
            if (config.onReady) {
                window.setTimeout(config.onReady, 10);
            }
        }
        
        _callerWindow = easyXSS.DomHelper.createFrame(_remoteUrl, ((config.local) ? "" : "xss_" + config.channel), config.container, function(){
            if (config.onReady) {
                if (config.local) {
                    // Register onReady callback in the library so that
                    // it can be called when hash.html has loaded.
                    easyXSS.Events.registerOnReady(config.channel, _onReady);
                }
                else {
                    _onReady();
                }
            }
        });
        return {
            /** 
             * Sends a message by encoding and placing it in the hash part of _callerWindows url.
             * We include a message number so that identical messages will be read as separate messages.
             * @param {String} message The message to send
             */
            postMessage: function(message){
                // #ifdef debug
                easyXSS.Debug.trace("sending message '" + message + "' to " + _remoteOrigin);
                // #endif
                _callerWindow.src = _remoteUrl + "#" + (_msgNr++) + "_" + encodeURIComponent(message);
            },
            /**
             *
             */
            destroy: function(){
                // #ifdef debug
                easyXSS.Debug.trace("destroying transport");
                // #endif
                window.clearInterval(_timer);
                _callerWindow.parentNode.removeChild(_callerWindow);
                _callerWindow = null;
            }
        };
    }
};


