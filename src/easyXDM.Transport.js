/*global easyXDM, window*/
easyXDM.transport = {
    /**
     * @class easyXDM.transport.BestAvailableTransport
     * BestAvailableTransport is a transport class that uses the best transport available.<br/>
     * This class will first try to use the PostMessageTransport<br/>
     * then the NameTransport if the <code>remoteHelper</code> parameter is set,<br/>
     * and at last the HashTransport.<br/>
     * The config parameter should contain all parameters needed for the different transports.
     * @constructor
     * @param {easyXDM.configuration.TransportConfiguration} config The transports configuration.
     * @param {Function} onReady A method that should be called when the transport is ready
     * @namespace easyXDM.transport
     */
    BestAvailableTransport: function(config, onReady){
        // #ifdef debug
        easyXDM.Debug.trace("easyXDM.transport.BestAvailableTransport.constructor");
        // #endif
        // If no protocol is set then it means this is the host
        var query = easyXDM.Url.Query();
        var isHost = (typeof query.p === "undefined");
        var Transport;
        if (isHost) {
            config.channel = (config.channel) ? config.channel : "default";
            if (window.postMessage) {
                Transport = easyXDM.transport.PostMessageTransport;
            }
            else {
                if (config.remoteHelper) {
                    Transport = easyXDM.transport.NameTransport;
                }
                else {
                    Transport = easyXDM.transport.HashTransport;
                }
            }
        }
        else {
            if (typeof query.endpoint !== "string") {
                throw ("No remote specified");
            }
            config.channel = query.channel;
            config.remote = decodeURIComponent(query.endpoint);
            switch (query.p) {
                case "0":
                    Transport = easyXDM.transport.HashTransport;
                    break;
                case "1":
                    Transport = easyXDM.transport.PostMessageTransport;
                    break;
                case "2":
                    Transport = easyXDM.transport.NameTransport;
                    break;
            }
        }
        
        return new Transport(config, onReady);
    },
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
     * @cfg {Function} onMessage The method that should handle incoming messages.<br/> This method should accept two arguments, the message as a string, and the origin as a string.
     * @namespace easyXDM.transport
     */
    PostMessageTransport: function(config, onReady){
        if (!window.postMessage) {
            throw new Error("This browser does not support window.postMessage");
        }
        // #ifdef debug
        easyXDM.Debug.trace("easyXDM.transport.PostMessageTransport.constructor");
        // #endif
        // If no protocol is set then it means this is the host
        var isHost = (typeof easyXDM.Url.Query().p === "undefined");
        var _callerWindow, _targetOrigin = easyXDM.Url.getLocation(config.remote), _window_onMessageImplementation;
        
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
         * Delays calling onReady until the class has been returned
         * @private
         */
        function _onReady(){
            if (onReady) {
                window.setTimeout(onReady, 5);
            }
        }
        
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
                easyXDM.Debug.trace("received unexpected message: " + event.data + ", expected " + config.channel + "-ready");
            }
            // #endif
        }
        /**
         * Destroy all that we can destroy :)
         */
        this.destroy = function(){
            // #ifdef debug
            easyXDM.Debug.trace("destroying transport");
            // #endif
            easyXDM.DomHelper.removeEventListener(window, "message", _window_onMessage);
            if (isHost) {
                _callerWindow.parentNode.removeChild(_callerWindow);
                _callerWindow = null;
            }
        };
        
        
        /** 
         * Sends the message using the postMethod method available on the window object
         * @param {String} message The message to send
         */
        this.postMessage = (function(){
            // Set up the messaging differently dependin on being local or remote
            if (isHost) {
                _window_onMessageImplementation = _waitForReady;
                _callerWindow = easyXDM.DomHelper.createFrame(easyXDM.Url.appendQueryParameters(config.remote, {
                    endpoint: easyXDM.Url.resolveUrl(config.local),
                    channel: config.channel,
                    p: 1 // 1 = PostMessage
                }), config.container);
                return function(message){
                    // #ifdef debug
                    easyXDM.Debug.trace("sending message '" + message + "' to iframe " + _targetOrigin);
                    // #endif
                    _callerWindow.contentWindow.postMessage(config.channel + " " + message, _targetOrigin);
                };
            }
            else {
                _window_onMessageImplementation = _handleMessage;
                // #ifdef debug
                easyXDM.Debug.trace("firing onReady");
                // #endif
                window.parent.postMessage(config.channel + "-ready", _targetOrigin);
                _onReady();
                return function(message){
                    // #ifdef debug
                    easyXDM.Debug.trace("sending message '" + message + "' to parent " + _targetOrigin);
                    // #endif
                    window.parent.postMessage(config.channel + " " + message, _targetOrigin);
                };
                
            }
        }());
    },
    
    /**
     * @class easyXDM.transport.HashTransport
     * HashTransport is a transport class that uses the IFrame URL Technique for communication
     * <a href="http://msdn.microsoft.com/en-us/library/bb735305.aspx">http://msdn.microsoft.com/en-us/library/bb735305.aspx</a>
     * @constructor
     * @param {easyXDM.configuration.TransportConfiguration} config The transports configuration.
     * @param {Function} onReady A method that should be called when the transport is ready
     * @cfg {Number} readyAfter The number of milliseconds to wait before firing onReady. To support using passive hash files.
     * @cfg {String/Window} local The url to the local document for calling back, or the local window.
     * @cfg {String} remote The url to the remote document to interface with
     * @cfg {Function} onMessage The method that should handle incoming messages.<br/> This method should accept two arguments, the message as a string, and the origin as a string.
     * @namespace easyXDM.transport
     */
    HashTransport: function(config, onReady){
        // #ifdef debug
        easyXDM.Debug.trace("easyXDM.transport.HashTransport.constructor");
        // #endif
        // If no protocol is set then it means this is the host
        var isHost = (typeof easyXDM.Url.Query().p === "undefined");
        var _timer, pollInterval = config.interval || 300, usePolling = false, useParent = false, useResize = true;
        var _lastMsg = "#" + config.channel, _msgNr = 0, _listenerWindow, _callerWindow;
        var _remoteUrl, _remoteOrigin = easyXDM.Url.getLocation(config.remote);
        
        if (isHost) {
            var parameters = {
                channel: config.channel,
                p: 0 // 0 = HashTransport
            };
            if (config.local === window) {
                // We are using the current window to listen to
                usePolling = true;
                useParent = true;
                config.local = location.protocol + "//" + location.host + location.pathname + location.search;
                parameters.parent = 1;
            }
            if (config.container) {
                useResize = false;
                parameters.poll = 1;
            }
            parameters.endpoint = easyXDM.Url.resolveUrl(config.local);
            _remoteUrl = easyXDM.Url.appendQueryParameters(config.remote, parameters);
            
        }
        else {
            var query = easyXDM.Url.Query();
            _listenerWindow = window;
            useParent = (typeof query.parent !== "undefined");
            usePolling = (typeof query.poll !== "undefined");
            _remoteUrl = config.remote + "#" + config.channel;
        }
        // #ifdef debug
        if (usePolling) {
            easyXDM.Debug.trace("using polling to listen");
        }
        if (useResize) {
            easyXDM.Debug.trace("using resizing to call");
        }
        if (useParent) {
            easyXDM.Debug.trace("using current window as " + (config.local ? "listenerWindow" : "callerWindow"));
        }
        // #endif
        /**
         * Checks location.hash for a new message and relays this to the receiver.
         * @private
         */
        function _checkForMessage(){
            try {
                if (_listenerWindow.location.hash && _listenerWindow.location.hash != _lastMsg) {
                    _lastMsg = _listenerWindow.location.hash;
                    // #ifdef debug
                    easyXDM.Debug.trace("received message '" + _lastMsg + "' from " + _remoteOrigin);
                    // #endif
                    config.onMessage(decodeURIComponent(_lastMsg.substring(_lastMsg.indexOf("_") + 1)), _remoteOrigin);
                }
            } 
            catch (ex) {
                // #ifdef debug
                easyXDM.Debug.trace(ex.message);
                // #endif
            }
        }
        
        /**
         * Calls the supplied onReady method<br/>
         * We delay this so that the the call to createChannel or createTransport will have completed.
         * @private
         */
        function _onReady(){
            if (isHost) {
                if (useParent) {
                    _listenerWindow = window;
                }
                else {
                    if (config.readyAfter) {
                        // We must try obtain a reference to the correct window, this might fail 
                        _listenerWindow = window.open(config.local + "#" + config.channel, "remote_" + config.channel);
                    }
                    else {
                        _listenerWindow = easyXDM.transport.HashTransport.getWindow(config.channel);
                    }
                    if (!_listenerWindow) {
                        // #ifdef debug
                        easyXDM.Debug.trace("Failed to obtain a reference to the window");
                        // #endif
                        throw new Error("Failed to obtain a reference to the window");
                    }
                }
            }
            if (usePolling) {
                // #ifdef debug
                easyXDM.Debug.trace("starting polling");
                // #endif
                _timer = window.setInterval(function(){
                    _checkForMessage();
                }, pollInterval);
            }
            else {
                easyXDM.DomHelper.addEventListener(_listenerWindow, "resize", _checkForMessage);
            }
            if (onReady) {
                window.setTimeout(onReady, 10);
            }
        }
        
        /** 
         * Sends a message by encoding and placing it in the hash part of _callerWindows url.
         * We include a message number so that identical messages will be read as separate messages.
         * @param {String} message The message to send
         */
        this.postMessage = function(message){
            // #ifdef debug
            easyXDM.Debug.trace("sending message '" + message + "' to " + _remoteOrigin);
            // #endif
            if (isHost || !useParent) {
                // We are referencing an iframe
                _callerWindow.src = _remoteUrl + "#" + (_msgNr++) + "_" + encodeURIComponent(message);
                if (useResize) {
                    _callerWindow.width = _callerWindow.width > 75 ? 50 : 100;
                }
            }
            else {
                // We are referencing the parent window
                _callerWindow.location = _remoteUrl + "#" + (_msgNr++) + "_" + encodeURIComponent(message);
            }
        };
        
        /**
         * Tries to clean up the DOM
         */
        this.destroy = function(){
            // #ifdef debug
            easyXDM.Debug.trace("destroying transport");
            // #endif
            if (usePolling) {
                window.clearInterval(_timer);
            }
            else {
                if (_listenerWindow) {
                    easyXDM.DomHelper.removeEventListener(_listenerWindow, "resize", _checkForMessage);
                }
            }
            if (isHost || !useParent) {
                _callerWindow.parentNode.removeChild(_callerWindow);
            }
            _callerWindow = null;
        };
        
        if (isHost) {
            if (config.readyAfter) {
                // Fire the onReady method after a set delay
                window.setTimeout(_onReady, config.readyAfter);
            }
            else {
                // Register onReady callback in the library so that
                // it can be called when hash.html has loaded.
                easyXDM.Fn.set(config.channel, _onReady);
            }
        }
        if (!isHost && useParent) {
            _callerWindow = parent;
            _onReady();
        }
        else {
            _callerWindow = easyXDM.DomHelper.createFrame(_remoteUrl, config.container, (isHost && !useParent) ? null : _onReady, (isHost ? "local_" : "remote_") + config.channel);
        }
    }
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
    var isHost = (typeof easyXDM.Url.Query().p === "undefined");
    
    var _callerWindow, remoteWindow, readyCount = 0;
    var remoteOrigin = easyXDM.Url.getLocation(config.remote), remoteUrl;
    
    if (isHost) {
        remoteUrl = easyXDM.Url.appendQueryParameters(config.remote, {
            endpoint: easyXDM.Url.resolveUrl(config.local),
            channel: config.channel,
            p: 2
        });
    }
    else {
        config.remoteHelper = config.remote;
    }
    
    config.local = easyXDM.Url.resolveUrl(config.local);
    
    /** 
     * Sends a message by placing it in the <code>name</code> property of the callerwindow and then 
     * redirecting the window to the remote instance of hash.html.<br/>
     * hash.html will send the document back after having passed on the message.
     * @param {String} message The message to send
     */
    this.postMessage = function(message){
        // #ifdef debug
        easyXDM.Debug.trace("sending message '" + message + "' to " + remoteOrigin);
        // #endif
        _callerWindow.contentWindow.name = message;
        if (isHost) {
            // #ifdef debug
            easyXDM.Debug.trace("navigating to  '" + config.remoteHelper + "#_3" + encodeURIComponent(remoteUrl + "#" + config.channel) + "'");
            // #endif
            _callerWindow.contentWindow.location = config.remoteHelper + "#_3" + encodeURIComponent(remoteUrl + "#" + config.channel);
        }
        else {
            // #ifdef debug
            easyXDM.Debug.trace("navigating to  '" + config.remoteHelper + "#_3" + config.channel + "'");
            // #endif
            _callerWindow.contentWindow.location = config.remoteHelper + "#_2" + config.channel;
        }
    };
    
    /**
     * Tries to clean up the DOM
     */
    this.destroy = function(){
        // #ifdef debug
        easyXDM.Debug.trace("destroying transport");
        // #endif
        _callerWindow.parentNode.removeChild(_callerWindow);
        if (isHost) {
            remoteWindow.parentNode.removeChild(remoteWindow);
            remoteWindow = null;
        }
        _callerWindow = null;
    };
    
    function _onReady(){
        if (isHost) {
            if (++readyCount === 2 || !isHost && onReady) {
                window.setTimeout(onReady, 10);
            }
        }
        else {
            if (!isHost) {
                me.postMessage("ready");
            }
            if (onReady) {
                // #ifdef debug
                easyXDM.Debug.trace("calling onReady");
                // #endif
                window.setTimeout(onReady, 10);
            }
        }
        
    }
    
    if (isHost) {
        // #ifdef debug
        easyXDM.Debug.trace("creating remote iframe '" + remoteUrl + '#' + config.channel + "'");
        // #endif
        var con = config.container.appendChild(document.createElement("div"));
        con.innerHTML = '<iframe name="' + config.channel + '" id="' + config.channel + '" src="' + remoteUrl + '#' + config.channel + '"></iframe>';
        remoteWindow = con.firstChild;
        config.container.appendChild(remoteWindow);
        config.container.removeChild(con);
    }
    
    _callerWindow = easyXDM.DomHelper.createFrame(config.local, null, function(){
        //remove the handler
        easyXDM.DomHelper.removeEventListener(_callerWindow, "load", _callerWindow.loadFn);
        _onReady();
    });
    
    // Register the receiver
    if (isHost) {
        easyXDM.Fn.set(config.channel, function(message){
            if (isHost && message === "ready") {
                // Overwrite the handler
                easyXDM.Fn.set(config.channel, function(message){
                    config.onMessage(message, remoteOrigin);
                });
                _onReady();
            }
        });
    }
    else {
        easyXDM.Fn.set(config.channel, function(message){
            config.onMessage(message, remoteOrigin);
        });
    }
    
};
