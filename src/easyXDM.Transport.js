easyXDM.transport = {
    // #ifdef debug
    /**
     * @class easyXDM.transport.ITransport
     * The interface implemented by all transport classes.<br/>
     * Only available in debug mode.
     * @namespace easyXDM.transport
     */
    ITransport: {
        /**
         * Sends the message
         * @param {String} message The message to send
         */
        postMessage: function(message){
        },
        /** 
         * Breaks down the connection and tries to clean up the dom.
         */
        destroy: function(){
        }
    },
    // #endif
    /**
     * @class easyXDM.transport.BestAvailableTransport
     * @extends easyXDM.transport.ITransport
     * BestAvailableTransport is a transport class that uses the best transport available.
     * Currently it will select among PostMessageTransport and HashTransport.
     * @constructor
     * @param {easyXDM.transport.TransportConfiguration} config The transports configuration.
     * @param {Function} onReady A method that should be called when the transport is ready
     * @namespace easyXDM.transport
     */
    BestAvailableTransport: function(config, onReady){
        // #ifdef debug
        easyXDM.Debug.trace("easyXDM.transport.BestAvailableTransport.constructor");
        // #endif
        if (config.local) {
            config.channel = (config.channel) ? config.channel : "default";
        }
        else {
            var query = easyXDM.Url.Query();
            config.channel = query.channel;
            config.remote = query.endpoint;
        }
        var type = "HashTransport";
        if (window.postMessage) {
            type = "PostMessageTransport";
        }
        return new easyXDM.transport[type](config, onReady);
        
    },
    /**
     * @class easyXDM.transport.PostMessageTransport
     * @extends easyXDM.transport.ITransport
     * PostMessageTransport is a transport class that uses HTML5 postMessage for communication
     * <a href="http://msdn.microsoft.com/en-us/library/ms644944(VS.85).aspx">http://msdn.microsoft.com/en-us/library/ms644944(VS.85).aspx</a>
     * <a href="https://developer.mozilla.org/en/DOM/window.postMessage">https://developer.mozilla.org/en/DOM/window.postMessage</a>
     * @constructor
     * @param {easyXDM.transport.TransportConfiguration} config The transports configuration.
     * @param {Function} onReady A method that should be called when the transport is ready
     * @namespace easyXDM.transport
     */
    PostMessageTransport: function(config, onReady){
        // #ifdef debug
        easyXDM.Debug.trace("easyXDM.transport.PostMessageTransport.constructor");
        // #endif
        var _targetOrigin = easyXDM.Url.getLocation(config.remote);
        var _callerWindow;
        
        /**
         * Resolves the origin from the event object
         * @private
         * @param {Object} event The messageevent
         * @return {String} The scheme, host and port of the origin
         */
        function _getOrigin(event){
            if (event.origin) {
                // This is the standardized property
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
         * Delays calling onReady until the class has been returned
         * @private
         */
        function _onReady(){
            if (onReady) {
                window.setTimeout(onReady, 5);
            }
        }
        
        
        // This will at any time point to the real implementation of the onMessage handler
        var _window_onMessageImplementation;
        
        /**
         * The main onMessage handler. This will pass on the event to the real implementation
         * @private
         * @param {Object} event The messageevent
         */
        function _window_onMessage(event){
            // #ifdef debug
            easyXDM.Debug.trace("onMessage");
            // #endif
            _window_onMessageImplementation(event);
        }
        easyXDM.DomHelper.addEventListener(window, "message", _window_onMessage);
        
        /**
         * This is the main implementation for the onMessage event.<br/>
         * It checks the validity of the origin and passes the message on if appropriate.
         * @private
         * @param {Object} event The messageevent
         */
        function _handleMessage(event){
            var origin = _getOrigin(event);
            // #ifdef debug
            easyXDM.Debug.trace("received message '" + event.data + "' from " + origin);
            // #endif
            if (origin == _targetOrigin && event.data.substring(0, config.channel.length + 1) == config.channel + " ") {
                config.onMessage(event.data.substring(config.channel.length + 1), origin);
            }
        }
        
        /**
         * Used by local to fire the onReady method.
         * After being notified by the remote, this method will replace the
         * onMessage handler with _handleMessage and fire onReady
         * @private
         * @param {Object} event The messageevent
         */
        function _waitForReady(event){
            if (event.data == config.channel + "-ready") {
                // #ifdef debug
                easyXDM.Debug.trace("firing onReady");
                // #endif
                // We use memoization to avoid having to run this check each time
                _window_onMessageImplementation = _handleMessage;
                _onReady();
            }
            // #ifdef debug
            else {
                easyXDM.Debug.trace("received unexpected message: " + event.data);
            }
            // #endif
        }
        
        /** 
         * Sends the message using the postMethod method available on the window object
         * @param {String} message The message to send
         */
        this.postMessage = function(message){
        };
        /**
         * Destroy all that we can destroy :)
         */
        this.destroy = function(){
            // #ifdef debug
            easyXDM.Debug.trace("destroying transport");
            // #endif
            easyXDM.DomHelper.removeEventListener(window, "message", _window_onMessage);
            if (config.local) {
                _callerWindow.parentNode.removeChild(_callerWindow);
                _callerWindow = null;
            }
        };
        
        // Set up the messaging differently depending on being local or remote
        if (config.local) {
            this.postMessage = function(message){
                // #ifdef debug
                easyXDM.Debug.trace("sending message '" + message + "' to iframe " + _targetOrigin);
                // #endif
                _callerWindow.contentWindow.postMessage(config.channel + " " + message, _targetOrigin);
            };
            _window_onMessageImplementation = _waitForReady;
            _callerWindow = easyXDM.DomHelper.createFrame(config.remote + "?endpoint=" + easyXDM.Url.resolveUrl(config.local) + "&channel=" + config.channel, config.container);
        }
        else {
            this.postMessage = function(message){
                // #ifdef debug
                easyXDM.Debug.trace("sending message '" + message + "' to parent " + _targetOrigin);
                // #endif
                window.parent.postMessage(config.channel + " " + message, _targetOrigin);
            };
            _window_onMessageImplementation = _handleMessage;
            // #ifdef debug
            easyXDM.Debug.trace("firing onReady");
            // #endif
            window.parent.postMessage(config.channel + "-ready", _targetOrigin);
            _onReady();
        }
    },
    /**
     * @class easyXDM.transport.HashTransport
     * @extends easyXDM.transport.ITransport
     * HashTransport is a transport class that uses the IFrame URL Technique for communication
     * <a href="http://msdn.microsoft.com/en-us/library/bb735305.aspx">http://msdn.microsoft.com/en-us/library/bb735305.aspx</a>
     * @constructor
     * @param {easyXDM.transport.TransportConfiguration} config The transports configuration.
     * @param {Function} onReady A method that should be called when the transport is ready
     * @namespace easyXDM.transport
     */
    HashTransport: function(config, onReady){
        // #ifdef debug
        easyXDM.Debug.trace("easyXDM.transport.HashTransport.constructor");
        // #endif
        var _timer = null;
        var _lastMsg = "#" + config.channel, _msgNr = 0;
        var _listenerWindow = (!config.local) ? window : null, _callerWindow;
        var _remoteUrl = config.remote;
        if (config.local) {
            _remoteUrl += "?endpoint=" + easyXDM.Url.resolveUrl(config.local) + "&channel=" + config.channel;
        }
        else {
            _remoteUrl += "#" + config.channel;
        }
        var _remoteOrigin = easyXDM.Url.getLocation(config.remote);
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
                _listenerWindow = easyXDM.transport.HashTransport.getWindow(config.channel);
                if (!_listenerWindow) {
                    throw "Not able to get a reference to the iframe";
                }
            }
            if (_listenerWindow.location.hash && _listenerWindow.location.hash != _lastMsg) {
                _lastMsg = _listenerWindow.location.hash;
                // #ifdef debug
                easyXDM.Debug.trace("received message '" + _lastMsg + "' from " + _remoteOrigin);
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
            if (onReady) {
                window.setTimeout(onReady, 10);
            }
        }
        if (config.local) {
            // Register onReady callback in the library so that
            // it can be called when hash.html has loaded.
            easyXDM.transport.HashTransport.registerOnReady(config.channel, _onReady);
        }
        _callerWindow = easyXDM.DomHelper.createFrame(_remoteUrl, config.container, (config.local) ? null : _onReady);
        /** 
         * Sends a message by encoding and placing it in the hash part of _callerWindows url.
         * We include a message number so that identical messages will be read as separate messages.
         * @param {String} message The message to send
         */
        this.postMessage = function(message){
            // #ifdef debug
            easyXDM.Debug.trace("sending message '" + message + "' to " + _remoteOrigin);
            // #endif
            _callerWindow.src = _remoteUrl + "#" + (_msgNr++) + "_" + encodeURIComponent(message);
        };
        /**
         *
         */
        this.destroy = function(){
            // #ifdef debug
            easyXDM.Debug.trace("destroying transport");
            // #endif
            window.clearInterval(_timer);
            _callerWindow.parentNode.removeChild(_callerWindow);
            _callerWindow = null;
        };
    }
};

/**
 * Contains the callbacks used to notify local that the remote end is ready
 */
easyXDM.transport.HashTransport.callbacks = {};
/**
 * Contains the proxy windows used to read messages from remote when
 * using HashTransport.
 */
easyXDM.transport.HashTransport.windows = {};

/**
 * Register a callback that should be called when the remote end of a channel is ready
 * @param {String} channel
 * @param {Function} callback
 */
easyXDM.transport.HashTransport.registerOnReady = function(channel, callback){
    // #ifdef debug
    easyXDM.Debug.trace("registering onReady callback for channel " + channel);
    // #endif
    easyXDM.transport.HashTransport.callbacks[channel] = callback;
};

/**
 * Notify that a channel is ready and register a window to be used for reading messages
 * for on the channel.
 * @param {String} channel
 * @param {Window} contentWindow
 */
easyXDM.transport.HashTransport.channelReady = function(channel, contentWindow){
    easyXDM.transport.HashTransport.windows[channel] = contentWindow;
    // #ifdef debug
    easyXDM.Debug.trace("executing onReady callback for channel " + channel);
    // #endif
    var fn = easyXDM.transport.HashTransport.callbacks[channel];
    if (fn) {
        fn();
        delete easyXDM.transport.HashTransport.callbacks[channel];
    }
    
};

/**
 * Returns the window associated with a channel
 * @param {String} channel
 * @return {Window} The window
 */
easyXDM.transport.HashTransport.getWindow = function(channel){
    return easyXDM.transport.HashTransport.windows[channel];
};
