/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

(function(){

    function LogBehavior(){
    
        return {
            incomming: function(message, origin){
                // #ifdef debug
                easyXDM.Debug.trace("LogBehavior: incomming");
                // #endif
                this.up.incomming(message, origin);
            },
            outgoing: function(message, origin, callback){
                // #ifdef debug
                easyXDM.Debug.trace("LogBehavior: outgoing");
                // #endif
                this.down.outgoing(message, origin, callback);
            },
            destroy: function(){
                this.up.destroy();
            },
            callback: function(success){
                this.up.callback(success);
            }
        };
    }
    
    function EncodingBehavior(){
    
        return {
            incomming: function(message, origin){
                // #ifdef debug
                easyXDM.Debug.trace("decoding");
                // #endif
                this.up.incomming(decodeURIComponent(message), origin);
            },
            outgoing: function(message, origin, callback){
                // #ifdef debug
                easyXDM.Debug.trace("encoding");
                // #endif
                this.down.outgoing(encodeURIComponent(message), origin, callback);
            },
            destroy: function(){
                this.up.destroy();
            },
            callback: function(success){
                this.up.callback(success);
            }
        };
    }
    
    /**
     *
     * @param {Object} settings
     */
    function ReliableBehavior(settings){
        var pub, timer, current, msgId = 0, tryCount = 0, timeout = settings.timeout, lastMsgId, callback;
        // #ifdef debug
        easyXDM.Debug.trace("ReliableBehavior settings.timeout=" + settings.timeout);
        // #endif
        return (pub = {
            incomming: function(message, origin){
                // #ifdef debug
                easyXDM.Debug.trace("-> " + message);
                // #endif
                if (message.substring(0, 1) === "|") {
                    window.clearTimeout(timer);
                    // #ifdef debug
                    easyXDM.Debug.trace("message delivered");
                    // #endif
                    if (callback) {
                        callback(true);
                    }
                }
                else {
                    // Send an ack back
                    message = message.substring(1);
                    var msgid = message.substring(0, message.indexOf("_"));
                    // #ifdef debug
                    easyXDM.Debug.trace("lastid " + lastMsgId + ", this " + msgid);
                    // #endif
                    if (msgid === lastMsgId) {
                        // #ifdef debug
                        easyXDM.Debug.trace("duplicate msgid " + msgid + ", resending ack");
                        // #endif
                    }
                    else {
                        lastMsgId = msgid;
                        message = message.substring(msgid.length + 1);
                        // #ifdef debug
                        easyXDM.Debug.trace("sending ack, passing on " + message);
                        // #endif
                        pub.down.outgoing("|ack", origin);
                        pub.up.incomming(message, origin);
                    }
                }
            },
            outgoing: function(message, origin, fn){
                callback = fn;
                tryCount = 0;
                current = {
                    data: "-" + (++msgId) + "_" + message,
                    origin: origin
                };
                
                // Keep resending until we have an ack
                (function send(){
                    if (tryCount++ > 5) {
                        if (callback) {
                            // #ifdef debug
                            easyXDM.Debug.trace("delivery failed");
                            // #endif
                            callback(false);
                        }
                    }
                    else {
                        // #ifdef debug
                        easyXDM.Debug.trace((tryCount === 1 ? "sending " : "resending ") + msgId + ", tryCount " + tryCount);
                        // #endif
                        pub.down.outgoing(current.data, current.origin);
                        timer = window.setTimeout(send, settings.timeout);
                    }
                    
                }());
            },
            destroy: function(){
                if (timer) {
                    window.clearInterval(timer);
                }
                pub.up.destroy();
            },
            callback: function(success){
                pub.up.callback(success);
            }
        });
    }
    
    function QueueBehavior(settings){
        var pub, queue = [], waiting = false, incomming = "", destroying;
        
        function dispatch(){
            if (waiting || queue.length === 0 || destroying) {
                return;
            }
            // #ifdef debug
            easyXDM.Debug.trace("dispatching from queue");
            // #endif
            waiting = true;
            var message = queue.shift();
            
            pub.down.outgoing(message.data, message.origin, function(success){
                waiting = false;
                if (message.callback) {
                    message.callback(success);
                }
                dispatch();
            });
        }
        return (pub = {
            incomming: function(message, origin){
                var indexOf = message.indexOf("_"), seq = parseInt(message.substring(0, indexOf), 10);
                incomming += message.substring(indexOf + 1);
                if (seq === 0) {
                    // #ifdef debug
                    easyXDM.Debug.trace("last fragment received");
                    // #endif
                    pub.up.incomming(incomming, origin);
                    incomming = "";
                }
                // #ifdef debug
                else {
                    easyXDM.Debug.trace("awaiting more fragments");
                }
                // #endif
            
            },
            outgoing: function(message, origin, fn){
                var fragments = [], fragment;
                while (message.length !== 0) {
                    // #ifdef debug
                    easyXDM.Debug.trace("fragmenting");
                    // #endif
                    fragment = message.substring(0, settings.maxLength);
                    message = message.substring(fragment.length);
                    fragments.push(fragment);
                }
                
                while ((fragment = fragments.shift())) {
                    // #ifdef debug
                    easyXDM.Debug.trace("enqueuing");
                    // #endif
                    queue.push({
                        data: fragments.length + "_" + fragment,
                        origin: origin,
                        callback: fragments.length === 0 ? fn : null
                    });
                }
                dispatch();
            },
            destroy: function(){
                // #ifdef debug
                easyXDM.Debug.trace("QueueBehavior#destroy");
                // #endif
                destroying = true;
                pub.up.destroy();
            },
            callback: function(success){
                pub.up.callback(success);
            }
        });
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
            _remoteUrl = config.remote;
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
        
        function _sendMessage(message, origin, fn){
            // #ifdef debug
            easyXDM.Debug.trace("sending message '" + (_msgNr + 1) + " " + message + "' to " + origin);
            // #endif
            if (!_callerWindow) {
                // #ifdef debug
                easyXDM.Debug.trace("no caller window");
                // #endif
                return;
            }
            var url = _remoteUrl + "#" + (_msgNr++) + "_" + message;
            
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
            if (fn) {
                window.setTimeout(fn, useResize ? 0 : pollInterval);
            }
        }
        var pipeUp = {
            incomming: function(message, origin){
                config.onMessage(message, origin);
            },
            outgoing: _sendMessage,
            callback: function(succes){
                if (onReady) {
                    window.setTimeout(onReady, 10);
                }
            },
            destroy: function(){
            }
        }, pipeDown = {
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
            },
            // the default passthrough
            up: pipeUp,
            down: pipeUp
        };
        
        var behaviors = [], behavior;
        behaviors.push(new EncodingBehavior());
        behaviors.push(new LogBehavior());
        /*
         behaviors.push(new ReliableBehavior({
         timeout: ((useResize ? 50 : pollInterval * 1.5) + (usePolling ? pollInterval * 1.5 : 50))
         }));
         */
        behaviors.push(new QueueBehavior({
            maxLength: 4000 - _remoteUrl.length
        }));
        
        if (behaviors.length === 1) {
            behavior = behaviors[0];
            behavior.down = behavior.up = pipeUp;
            pipeDown.down = pipeDown.up = behavior;
        }
        else if (behaviors.length > 1) {
            for (var i = 0, len = behaviors.length; i < len; i++) {
                behavior = behaviors[i];
                if (i === 0) {
                    // this is the behavior closest to 'the metal'
                    pipeDown.up = behavior; // override 
                    behavior.down = pipeUp; // down to sendMessage
                    behavior.up = behaviors[i + 1];
                }
                else if (i === len - 1) {
                    // this is the behavior closes to the user
                    pipeDown.down = behavior; //override
                    behavior.down = behaviors[i - 1];
                    behavior.up = pipeUp;
                }
                else {
                    // intermediary behaviors
                    behavior.up = behaviors[i + 1];
                    behavior.down = behaviors[i - 1];
                }
            }
        }
        
        function _handleHash(hash){
            _lastMsg = hash;
            // #ifdef debug
            easyXDM.Debug.trace("received message '" + _lastMsg + "' from " + _remoteOrigin);
            // #endif
            pipeDown.incomming(_lastMsg.substring(_lastMsg.indexOf("_") + 1), _remoteOrigin);
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
            // #ifdef debug
            else {
                easyXDM.Debug.trace("poll: no change");
            }
            // #endif
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
                        _listenerWindow = window.open(config.local + "#" + config.channel, "remote_" + config.channel);
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
                    if (usePolling) {
                        // #ifdef debug
                        easyXDM.Debug.trace("starting polling");
                        // #endif
                        _timer = window.setInterval(_pollHash, pollInterval);
                    }
                    else if (config.readyAfter) {
                        // This cannot handle resize on its own
                        easyXDM.DomHelper.addEventListener(_listenerWindow, "resize", _onResize);
                        
                    }
                    pipeDown.callback(true);
                }
                else {
                    window.setTimeout(getBody, 10);
                }
            })();
        }
        
        /** 
         * Sends a message by encoding and placing it in the hash part of _callerWindows url.
         * We include a message number so that identical messages will be read as separate messages.
         * @param {String} message The message to send
         */
        this.postMessage = function(message){
            pipeDown.outgoing(message, _remoteOrigin);
        };
        
        /**
         * Tries to clean up the DOM
         */
        this.destroy = function(){
            // #ifdef debug
            easyXDM.Debug.trace("destroying transport");
            // #endif
            pipeDown.destroy();
            if (usePolling) {
                window.clearInterval(_timer);
            }
            else if (_listenerWindow && config.readyAfter) {
                easyXDM.DomHelper.removeEventListener(_listenerWindow, "resize", _pollHash);
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
                easyXDM.Fn.set(config.channel + "_onresize", _handleHash);
            }
        }
        if (!isHost && useParent) {
            _callerWindow = parent;
            _onReady();
        }
        else {
            _callerWindow = easyXDM.DomHelper.createFrame((isHost ? _remoteUrl : _remoteUrl + "#" + config.channel), config.container, (isHost && !useParent) ? null : _onReady, (isHost ? "local_" : "remote_") + config.channel);
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
