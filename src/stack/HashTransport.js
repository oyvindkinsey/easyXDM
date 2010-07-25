/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, getLocation, createFrame, debug, un, on, apply*/

/**
 * @class easyXDM.stack.HashTransport
 * HashTransport is a transport class that uses the IFrame URL Technique for communication.<br/>
 * <a href="http://msdn.microsoft.com/en-us/library/bb735305.aspx">http://msdn.microsoft.com/en-us/library/bb735305.aspx</a><br/>
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The transports configuration.
 * @cfg {String/Window} local The url to the local file used for proxying messages, or the local window.
 * @cfg {Number} delay The number of milliseconds easyXDM should try to get a reference to the local window.
 * @cfg {Number} interval The interval used when polling for messages.
 */
easyXDM.stack.HashTransport = function(config){
    // #ifdef debug
    var trace = debug.getTracer("easyXDM.stack.HashTransport");
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
    
    function _onResize(){
        // #ifdef debug
        trace("onresize: new message");
        // #endif
        var href = _listenerWindow.location.href, hash = "", indexOf = href.indexOf("#");
        if (indexOf != -1) {
            hash = href.substring(indexOf);
        }
        _handleHash(hash);
    }
    
    /**
     * Checks location.hash for a new message and relays this to the receiver.
     * @private
     */
    function _pollHash(){
        var href = _listenerWindow.location.href, hash = "", indexOf = href.indexOf("#");
        if (indexOf != -1) {
            hash = href.substring(indexOf);
        }
        if (hash && hash != _lastMsg) {
            // #ifdef debug
            trace("poll: new message");
            // #endif
            _handleHash(hash);
        }
    }
    
    function _attachListeners(){
        if (usePolling) {
            // #ifdef debug
            trace("starting polling");
            // #endif
            _timer = setInterval(_pollHash, pollInterval);
        }
        else {
            on(_listenerWindow, "resize", _onResize);
        }
    }
    
    return (pub = {
        outgoing: function(message, domain){
            _sendMessage(message);
        },
        destroy: function(){
            if (usePolling) {
                window.clearInterval(_timer);
            }
            else if (_listenerWindow) {
                un(_listenerWindow, "resize", _pollHash);
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
            _remoteOrigin = getLocation(config.remote);
            if (!isHost && useParent) {
                _listenerWindow = window;
                _callerWindow = parent;
                _attachListeners();
                pub.up.callback(true);
            }
            else {
                apply(config, {
                    props: {
                        src: (isHost ? config.remote : config.remote + "#" + config.channel),
                        name: (isHost ? "local_" : "remote_") + config.channel
                    },
                    onLoad: (isHost && useParent || !isHost) ? function(){
                        _listenerWindow = window;
                        _attachListeners();
                        pub.up.callback(true);
                    }
 : null
                });
                _callerWindow = createFrame(config);
                
                if (isHost && !useParent) {
                    var tries = 0, max = config.delay / 50;
                    (function getRef(){
                        if (++tries > max) {
                            // #ifdef debug
                            trace("unable to get reference to _listenerWindow, giving up");
                            // #endif
                            throw new Error("Unable to reference listenerwindow");
                        }
                        if (_listenerWindow) {
                            return;
                        }
                        try {
                            // This works in IE6
                            _listenerWindow = _callerWindow.contentWindow.frames["remote_" + config.channel];
                            window.clearTimeout(_timer);
                            _attachListeners();
                            // #ifdef debug
                            trace("got a reference to _listenerWindow");
                            // #endif
                            pub.up.callback(true);
                            return;
                        } 
                        catch (ex) {
                            setTimeout(getRef, 50);
                        }
                    }());
                }
            }
        }
    });
};
