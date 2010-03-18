/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/**
 * @class easyXDM.stack.HashTransport
 * HashTransport is a transport class that uses the IFrame URL Technique for communication.<br/>
 * This requires the precense of hash.html on the hosting domain for optimal performance, but can also be used with any other
 * static file present. If used with a static file (like an image) as the local: property, you must set the readyAfter property.<br/>
 * The library will try to be ready earlier, so this should be set to a safe value, when you are certain that the file will be loaded.<br/>
 * If this file is already present in the document, and therefor most likely cached, then this can be set to low value.<br/>
 * <a href="http://msdn.microsoft.com/en-us/library/bb735305.aspx">http://msdn.microsoft.com/en-us/library/bb735305.aspx</a><br/>
 * @extends easyXDM.stack.TransportStackElement
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The transports configuration.
 * @cfg {String/Window} local The url to the local file used for proxying messages, or the local window.
 * @cfg {Number} readyAfter The number of milliseconds to wait before firing onReady. To support using files other than hash.html for proxying messages.
 *
 */
easyXDM.stack.HashTransport = function(config){
    // #ifdef debug
    var trace = easyXDM.Debug.getTracer("easyXDM.stack.HashTransport");
    trace("constructor");
    // #endif    
    var pub;
    var me = this, isHost, _timer, pollInterval, _lastMsg, _msgNr, _listenerWindow, _callerWindow;
    var usePolling, useParent, useResize, _remoteOrigin;
    
    function _sendMessage(message){
        // #ifdef debug
        trace("sending message '" + (_msgNr + 1) + " " + message + "' to " + _remoteOrigin);
        // #endif
        if (!_callerWindow) {
            // #ifdef debug
            trace("no caller window");
            // #endif
            return;
        }
        var url = config.remote + "#" + (_msgNr++) + "_" + message;
        
        if (isHost || !useParent) {
            // We are referencing an iframe
            _callerWindow.contentWindow.location = url;
            if (useResize) {
                // #ifdef debug
                trace("resizing to new size " + (_callerWindow.width > 75 ? 50 : 100));
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
        trace("received message '" + _lastMsg + "' from " + _remoteOrigin);
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
            trace("poll: new message");
            // #endif
            _handleHash(_listenerWindow.location.hash);
        }
    }
    
    function _attachListeners(){
        if (usePolling) {
            // #ifdef debug
            trace("starting polling");
            // #endif
            _timer = window.setInterval(_pollHash, pollInterval);
        }
        else if ((!isHost && !usePolling) || config.readyAfter) {
            // This cannot handle resize on its own
            easyXDM.DomHelper.on(_listenerWindow, "resize", _onResize);
            
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
                    trace("Falling back to using window.open");
                    // #endif
                    _listenerWindow = window.open("", "remote_" + config.channel);
                }
            }
            else {
                _listenerWindow = easyXDM.stack.HashTransport.getWindow(config.channel);
            }
            if (!_listenerWindow) {
                // #ifdef debug
                trace("Failed to obtain a reference to the window");
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
                easyXDM.DomHelper.un(_listenerWindow, "resize", _pollHash);
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
                            trace("got an early reference to _listenerWindow");
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
                trace("using polling to listen");
            }
            if (useResize) {
                trace("using resizing to call");
            }
            if (useParent) {
                trace("using current window as " + (config.local ? "listenerWindow" : "callerWindow"));
            }
            // #endif
        }
    });
};



/**
 * Contains the proxy windows used to read messages from remote when
 * using HashTransport.
 * @static
 * @namespace easyXDM.transport
 */
easyXDM.stack.HashTransport.windows = {};

/**
 * Notify that a channel is ready and register a window to be used for reading messages
 * for on the channel.
 * @static
 * @param {String} channel
 * @param {Window} contentWindow
 * @namespace easyXDM.transport
 */
easyXDM.stack.HashTransport.channelReady = function(channel, contentWindow){
    var ht = easyXDM.stack.HashTransport;
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
easyXDM.stack.HashTransport.getWindow = function(channel){
    return easyXDM.stack.HashTransport.windows[channel];
};
