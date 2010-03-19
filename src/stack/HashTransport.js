/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/**
 * @class easyXDM.stack.HashTransport
 * HashTransport is a transport class that uses the IFrame URL Technique for communication.<br/>
 * <a href="http://msdn.microsoft.com/en-us/library/bb735305.aspx">http://msdn.microsoft.com/en-us/library/bb735305.aspx</a><br/>
 * @extends easyXDM.stack.TransportStackElement
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The transports configuration.
 * @cfg {String/Window} local The url to the local file used for proxying messages, or the local window.
 * @cfg {Number} delay The number of milliseconds to wait before firing onReady.  Optional, defaults to 1000.
 * @cfg {Number} interval The interval used when polling for messages. Optional, defaults to 300.
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
        // #ifdef debug
        trace("onresize: new message");
        // #endif
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
        else {
            easyXDM.DomHelper.on(_listenerWindow, "resize", _onResize);
        }
    }
    
    return (pub = {
        outgoing: function(message, domain){
            _sendMessage(encodeURIComponent(message));
        },
        destroy: function(){
            if (usePolling) {
                window.clearInterval(_timer);
            }
            else if (_listenerWindow) {
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
            
            if (!isHost && useParent) {
                _listenerWindow = window;
                _callerWindow = parent;
                _attachListeners();
                pub.up.callback(true);
            }
            else {
                _callerWindow = easyXDM.DomHelper.createFrame((isHost ? config.remote : config.remote + "#" + config.channel), config.container, (isHost && useParent || !isHost) ? function(){
                    _listenerWindow = window;
                    _attachListeners();
                    pub.up.callback(true);
                }
 : null, (isHost ? "local_" : "remote_") + config.channel);
                
                if (isHost && !useParent) {
                    var tries = 0, max = config.delay / 50;
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
                            _attachListeners();
                            pub.up.callback(true);
                            return;
                        } 
                        catch (ex) {
                            window.setTimeout(getRef, 50);
                        }
                    }());
                }
            }
        }
    });
};
