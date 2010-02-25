/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

(function(){

    function LogBehavior(){
    
    
        return {
            incomming: function(message){
                // #ifdef debug
                easyXDM.Debug.trace("<-- " + message.data);
                // #endif
            },
            outgoing: function(message){
                // #ifdef debug
                easyXDM.Debug.trace("-->" + message.data);
                // #endif
            }
        };
    }
    
    
    
    
    
    
    
    
    /**
     * @class easyXDM.transport.HashTransport
     * HashTransport is a transport class that uses the IFrame URL Technique for communication.<br/>
     * This means that the amount of data that is possible to send in each message is limited to the length the browser
     * allows for urls - the length of the url for <code>local</code>.<br/>
     * The HashTransport does not guarantee that the messages are read, something that also applies to the optimistic queuing.<br/>
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
    easyXDM.transport.HashTransport = function(config, onReady){
        // #ifdef debug
        easyXDM.Debug.trace("easyXDM.transport.HashTransport.constructor");
        // #endif
        // If no protocol is set then it means this is the host
        var query = easyXDM.Url.Query(), isHost = (typeof query.xdm_p === "undefined");
        if (!isHost) {
            config.channel = query.xdm_c;
            config.remote = decodeURIComponent(query.xdm_e);
        }
        var _timer, pollInterval = config.interval || 300, usePolling = false, useParent = false, useResize = true;
        var _lastMsg = "#" + config.channel, _msgNr = 0, _listenerWindow, _callerWindow;
        var _remoteUrl, _remoteOrigin = easyXDM.Url.getLocation(config.remote);
        
        if (isHost) {
            var parameters = {
                xdm_c: config.channel,
                xdm_p: 0 // 0 = HashTransport
            };
            if (config.local === window) {
                // We are using the current window to listen to
                usePolling = true;
                useParent = true;
                parameters.xdm_e = encodeURIComponent(config.local = location.protocol + "//" + location.host + location.pathname + location.search);
                parameters.xdm_pa = 1; // use parent
            }
            else {
                parameters.xdm_e = easyXDM.Url.resolveUrl(config.local);
            }
            if (config.container) {
                useResize = false;
                parameters.xdm_po = 1; // use polling
            }
            _remoteUrl = easyXDM.Url.appendQueryParameters(config.remote, parameters);
        }
        else {
            _listenerWindow = window;
            useParent = (typeof query.xdm_pa !== "undefined");
            if (useParent) {
                useResize = false;
            }
            usePolling = (typeof query.xdm_po !== "undefined");
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
                    var message = _lastMsg.substring(_lastMsg.indexOf("_") + 1);
                    config.onMessage(decodeURIComponent(message), _remoteOrigin);
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
            message = encodeURIComponent(message);
            var url = _remoteUrl + "#" + (_msgNr++) + "_" + message;
            
            if (isHost || !useParent) {
                // We are referencing an iframe
                _callerWindow.src = url;
                if (useResize) {
                    // #ifdef debug
                    easyXDM.Debug.trace("resizing to new size " + (_callerWindow.width > 75 ? 50 : 100));
                    // #endif
                    _callerWindow.width = _callerWindow.width > 75 ? 50 : 100;
                }
            }
            else {
                // We are referencing the parent window
                _callerWindow.location = url;
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
