/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/**
 *
 * @param {Object} config
 * @cfg {Boolean} isHost
 * @cfg {String} channel
 * @cfg {String} remote
 * @cfg {Boolean} useParent
 * @cfg {Boolean} usePolling
 * @cfg {Boolean} useResize
 * @cfg {Number} readyAfter
 */
easyXDM.behaviors.transports.HashTransportBehavior = function(config){
    // #ifdef debug
    easyXDM.Debug.trace("easyXDM.behaviors.transports.HashTransportBehavior");
    // #endif
    var pub;
    var me = this, isHost, _timer, pollInterval, _lastMsg, _msgNr, _listenerWindow, _callerWindow;
    var usePolling, useParent, useResize, _remoteOrigin;
    
    function _sendMessage(message){
        // #ifdef debug
        easyXDM.Debug.trace("sending message '" + (_msgNr + 1) + " " + message + "' to " + _remoteOrigin);
        // #endif
        if (!_callerWindow) {
            // #ifdef debug
            easyXDM.Debug.trace("no caller window");
            // #endif
            return;
        }
        var url = config.remote + "#" + (_msgNr++) + "_" + message;
        
        if (isHost || !useParent) {
            // We are referencing an iframe
            _callerWindow.contentWindow.location = url;
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
    }
    
    function _handleHash(hash){
        _lastMsg = hash;
        // #ifdef debug
        easyXDM.Debug.trace("received message '" + _lastMsg + "' from " + _remoteOrigin);
        // #endif
        pub.up.incoming(_lastMsg.substring(_lastMsg.indexOf("_") + 1), _remoteOrigin);
    }
    
    function _onResize(e){
        _handleHash(_listenerWindow.location.hash);
    }
    
    /**
     * Checks location.hash for a new message and relays this to the receiver.
     * @private
     */
    function _pollHash(){
        if (_listenerWindow.location.hash && _listenerWindow.location.hash != _lastMsg) {
            // #ifdef debug
            easyXDM.Debug.trace("poll: new message");
            // #endif
            _handleHash(_listenerWindow.location.hash);
        }
    }
    
    function _attachListeners(){
        if (usePolling) {
            // #ifdef debug
            easyXDM.Debug.trace("starting polling");
            // #endif
            _timer = window.setInterval(_pollHash, pollInterval);
        }
        else if ((!isHost && !usePolling) || config.readyAfter) {
            // This cannot handle resize on its own
            easyXDM.DomHelper.addEventListener(_listenerWindow, "resize", _onResize);
            
        }
    }
    
    /**
     * Calls the supplied onReady method<br/>
     * We delay this so that the the call to createChannel or createTransport will have completed.
     * @private
     */
    function _onReady(){
        if (isHost && !_listenerWindow) {
            if (useParent) {
                _listenerWindow = window;
            }
            else if (config.readyAfter) {
                // We must try obtain a reference to the correct window, this might fail 
                try {
                    // This works in IE6
                    _listenerWindow = _callerWindow.contentWindow.frames["remote_" + config.channel];
                } 
                catch (ex) {
                    // #ifdef debug
                    easyXDM.Debug.trace("Falling back to using window.open");
                    // #endif
                    _listenerWindow = window.open("", "remote_" + config.channel);
                }
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
        
        (function getBody(){
            if (_listenerWindow && _listenerWindow.document && _listenerWindow.document.body) {
                if (isHost) {
                    _attachListeners();
                }
                pub.up.callback(true);
            }
            else {
                window.setTimeout(getBody, 10);
            }
        }());
    }
    
    return (pub = {
        outgoing: function(message, domain){
            _sendMessage(encodeURIComponent(message));
        },
        destroy: function(){
            if (usePolling) {
                window.clearInterval(_timer);
            }
            else if ((!isHost && !usePolling) || config.readyAfter) {
                easyXDM.DomHelper.removeEventListener(_listenerWindow, "resize", _pollHash);
            }
            if (isHost || !useParent) {
                _callerWindow.parentNode.removeChild(_callerWindow);
            }
            _callerWindow = null;
        },
        init: function(){
            isHost = config.isHost;
            pollInterval = config.interval;
            _lastMsg = "#" + config.channel;
            _msgNr = 0;
            usePolling = config.usePolling;
            useParent = config.useParent;
            useResize = config.useResize;
            _remoteOrigin = easyXDM.Url.getLocation(config.remote);
            
            if (isHost) {
                if (config.readyAfter) {
                    // Fire the onReady method after a set delay
                    _timer = window.setTimeout(_onReady, config.readyAfter);
                }
                else {
                    // Register onReady callback in the library so that
                    // it can be called when hash.html has loaded.
                    easyXDM.Fn.set(config.channel, _onReady);
                    easyXDM.Fn.set(config.channel + "_onresize", _handleHash);
                }
            }
            else {
                _listenerWindow = window;
                _attachListeners();
            }
            if (!isHost && useParent) {
                _callerWindow = parent;
                _onReady();
            }
            else {
                _callerWindow = easyXDM.DomHelper.createFrame((isHost ? config.remote : config.remote + "#" + config.channel), config.container, (isHost && !useParent) ? null : _onReady, (isHost ? "local_" : "remote_") + config.channel);
                if (isHost && config.readyAfter) {
                    var tries = 0, max = config.readyAfter / 50;
                    (function getRef(){
                        if (++tries > max) {
                            return;
                        }
                        if (_listenerWindow) {
                            return;
                        }
                        try {
                            // This works in IE6
                            _listenerWindow = _callerWindow.contentWindow.frames["remote_" + config.channel];
                            // #ifdef debug
                            easyXDM.Debug.trace("got an early reference to _listenerWindow");
                            // #endif
                            window.clearTimeout(_timer);
                            _onReady();
                            return;
                        } 
                        catch (ex) {
                            window.setTimeout(getRef, 50);
                        }
                    }());
                }
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
        }
    });
};
