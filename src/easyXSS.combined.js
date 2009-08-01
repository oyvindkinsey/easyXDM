/*jslint browser: true, forin: true, immed: true, passfail: true, undef: true */

/*global window, escape, unescape */


/** 
 * A javascript library providing cross-browser, cross-site messaging/method invocation
 * @author <a href="mailto:oyvind@kinsey.no">Øyvind Sean Kinsey</a>, <a href="http://kinsey.no/blog/">http://kinsey.no/blog</a>
 * @class
 * @singleton
 */
var easyXSS = {
    /**
     * The version of the library
     */
    version: "1.2",
    /**
     * Creates an interface that can be used to call methods implemented
     * on the remote end of the channel, and also to provide the implementation
     * of methods to be called from the remote end.
     * @param {String} channel A valid channel for transportation
     * @param {easyXSS.Interface.InterfaceConfiguration} config A valid easyXSS-definition
     * @param {Function} onready A method that should be called when the interface is ready
     */
    createInterface: function(channel, config, onready){
        var _callbackCounter = 0, _callbacks = {};
        var _local = (config.local) ? config.local : null;
        
        function _onData(data, origin){
            /// <summary>
            /// Receives either a request or a response from the other
            /// end of the channel
            /// </summary>
            /// <param name="data" type="object">The request/repsonse</param>
            if (data.name) {
                // A method call from the remote end
                var method = _local[data.name];
                if (!method) {
                    throw "The method " + data.name + " is not implemented.";
                }
                if (method.isAsync) {
                    // The method is async, we need to add a callback
                    data.params.push(function(result){
                        // Send back the result
                        channel.sendData({
                            id: data.id,
                            response: result
                        });
                    });
                    // Call local method
                    method.method.apply(null, data.params);
                }
                else {
                    if (method.isVoid) {
                        // Call local method 
                        method.method.apply(null, data.params);
                    }
                    else {
                        // Call local method and send back the response
                        channel.sendData({
                            id: data.id,
                            response: method.method.apply(null, data.params)
                        });
                    }
                }
            }
            else {
                // A method response from the other end
                _callbacks[data.id](data.response);
                delete _callbacks[data.id];
            }
        }
        
        function _createRemote(methods){
            /// <summary>
            /// Creates a proxy to the methods located on the other end of the channel
            /// <summary>
            /// <param name="methods" type="Object">A description of the interface to implement</param>
            function _createConcrete(definition, name){
                /// <summary>
                /// Creates the concrete implementation of the supplied definition
                /// </summary>
                /// <param name="definitin" type="Object"/>
                /// <param name="name" type="String">The name of the method to expose</param>
                if (definition.isVoid) {
                    // No need to register a callback
                    return function(){
                        var params = [];
                        for (var i = 0, len = arguments.length; i < len; i++) {
                            params[i] = arguments[i];
                        }
                        // Send the method request
                        window.setTimeout(function(){
                            channel.sendData({
                                name: name,
                                params: params
                            });
                        }, 0);
                    };
                }
                else {
                    // We need to extract and register the callback
                    return function(){
                        _callbacks["" + (_callbackCounter)] = arguments[arguments.length - 1];
                        var request = {
                            name: name,
                            id: (_callbackCounter++),
                            params: []
                        };
                        for (var i = 0, len = arguments.length - 1; i < len; i++) {
                            request.params[i] = arguments[i];
                        }
                        // Send the method request
                        window.setTimeout(function(){
                            channel.sendData(request);
                        }, 0);
                    };
                }
            }
            var concrete = {};
            for (var name in methods) {
                concrete[name] = _createConcrete(methods[name], name);
            }
            return concrete;
        }
        channel.setOnData(_onData);
        channel.setConverter(JSON);
        if (onready) {
            window.setTimeout(onready, 10);
        }
        
        return (config.remote) ? _createRemote(config.remote) : null;
    },
    /**
     * Creates a transport channel using the available parameters.
     * Parameters are collected both from the supplied config,
     * but also from the querystring if not present in the config.
     * @param {easyXSS.Transport.TransportConfiguration} config The transports configuration
     * @return An object able to send and receive messages
     * @type easyXSS.Transport.ITransport
     */
    createTransport: function(config){
        if (config.local) {
            config.channel = (config.channel) ? config.channel : "default";
        }
        else {
            var query = easyXSS.Url.Query();
            config.channel = query.channel;
            config.remote = query.endpoint;
        }
        if (window.postMessage) {
            return new easyXSS.Transport.PostMessageTransport(config);
        }
        else {
            return new easyXSS.Transport.HashTransport(config);
        }
    },
    /**
     * The channels configuration
     * @extends easyXSS.Transport.TransportConfiguration
     * @class
     */
    ChannelConfiguration: {
        /**
         * The serializer to use
         * @type easyXSS.Serializing.ISerializer
         */
        converter: {}
    },
    /**
     * A channel
     * @constructor
     * @param {easyXSS.ChannelConfiguration} config The channels configuration
     */
    Channel: function(config){
    
        var sendData;
        if (config.converter) {
            /**
             * Wraps the onMessage method using the supplied serializer to convert
             * @param {Object} data
             * @ignore
             */
            config.onMessage = function(message, origin){
                this.onData(this.converter.parse(message), origin);
            };
            /**
             * Wraps the postMessage method using hte supplied serializer to convert
             * @param {Object} data
             * @ignore
             */
            sendData = function(data){
                this.transport.postMessage(config.converter.stringify(data));
            };
        }
        else {
            config.onMessage = config.onData;
            /**
             * @param {Object} message
             * @ignore
             */
            sendData = function(message){
                this.transport.postMessage(message);
            };
        }
        
        return {
            /**
             * The underlying transport used by this channel
             * @type easyXSS.Transport.ITransport
             */
            transport: easyXSS.createTransport(/** easyXSS.Transport.TransportConfiguration*/config),
            /**
             * Sets the serializer to be used when transmitting and receiving messages
             * @param {Object} converter The serializer to use
             */
            setConverter: function(converter){
                config.converter = converter;
                /**
                 * Wraps the postMessage method using the supplied serializer to convert
                 * @param {Object} data
                 * @ignore
                 */
                this.sendData = function(data){
                    this.transport.postMessage(config.converter.stringify(data));
                };
                /**
                 * Wraps the onData method using the supplied serializer to convert
                 * @param {String} message
                 * @param {String} origin
                 * @ignore
                 */
                config.onMessage = function(message, origin){
                    this.onData(this.converter.parse(message), origin);
                };
            },
            /**
             * Sets the method that should handle incoming messages
             * @param {Function} onData
             */
            setOnData: function(onData){
                config.onData = onData;
            },
            /**
             * Tries to destroy the underlying transport
             */
            destroy: function(){
                this.transport.destroy();
            },
            /**
             * Send data using the underlying transport
             * If a serializer is specified then this will be used to serialize the data first.
             * @param {Object} data
             */
            sendData: sendData
        };
    },
    /**
     * Creates a wrapper around the available transport mechanism that
     * also enables you to insert a serializer for the messages transmitted.
     * @param {Object} config The channels configuration
     * @return An object able to send and receive arbitrary data
     * @see {easyXSS.Channel}
     * @type {easyXSS.Channel}
     */
    createChannel: function(config){
        return new easyXSS.Channel(config);
        
    }
};
/** 
 * Contains methods for dealing with the DOM
 * @class
 */
easyXSS.DomHelper = {
    /**
     * Creates a frame and appends it to the DOM.
     * @param {String} url The url the frame should be set to
     * @param {String} name The id/name the frame should get
     * @param {DOMElement} container
     * @param {Function} onLoad A method that should be called with the frames contentWindow as argument when the frame is fully loaded.
     * @return The frames DOMElement
     * @type DOMElement
     */
    createFrame: function(url, name, container, onLoad){
        var frame;
        if (name && window.attachEvent) {
            // Internet Explorer does not support setting the 
            // name om DOMElements created in Javascript.
            // A workaround is to insert HTML and have the browser parse
            // and instantiate the element.
            var span = document.createElement("span");
            document.body.appendChild(span);
            span.innerHTML = '<iframe style="position:absolute;left:-2000px;" src="' + url + '" id="' + name + '" name="' + name + '"></iframe>';
            frame = document.getElementById(name);
            if (onLoad) {
                this.addEventListener(frame, "load", function(){
                    onLoad(frame.contentWindow);
                });
            }
        }
        else {
            // When name is not needed, or in other browsers, 
            // we use regular createElement.
            var framesets = document.getElementsByTagName("FRAMESET");
            if (!container && framesets && framesets.length > 0) {
                frame = document.createElement("FRAME");
                frame.src = url;
                if (onLoad) {
                    this.addEventListener(frame, "load", function(){
                        onLoad(frame.contentWindow);
                    });
                }
                framesets[0].appendChild(frame);
            }
            else {
                frame = document.createElement("IFRAME");
                frame.src = url;
                if (onLoad) {
                    this.addEventListener(frame, "load", function(){
                        onLoad(frame.contentWindow);
                    });
                }
                if (container) {
                    container.appendChild(frame);
                }
                else {
                    frame.style.position = "absolute";
                    frame.style.left = "-2000px";
                    document.body.appendChild(frame);
                }
            }
            frame.name = name;
            frame.id = name;
        }
        return frame;
    },
    /**
     * Gives a consistent interface for adding eventhandlers
     * @param {DOMElement} element The DOMElement to attach the handler to
     * @param {String} event The eventname
     * @param {Function} handler The handler to attach
     */
    addEventListener: function(element, event, handler){
        if (window.addEventListener) {
            element.addEventListener(event, handler, false);
        }
        else {
            element.attachEvent("on" + event, handler);
        }
    },
    /**
     * Gives a consistent interface for removing eventhandlers
     * @param {DOMElement} element The DOMElement to remove the handler from
     * @param {String} event The eventname
     * @param {Function} handler The handler to remove
     */
    removeEventListener: function(element, event, handler){
        if (window.removeEventListener) {
            element.removeEventListener(event, handler, false);
        }
        else {
            element.detachEvent("on" + event, handler);
        }
    }
};
/** 
 * Contains methods for dealing with special events needed to support the library
 * @class
 */
easyXSS.Events = (function(){
	/**
	 * Hashtable for storing callbacks when using hashTransport
	 * @private
	 */
    var onReadyCallbacks = {};
    return {
		/**
		 * Register a callback that can be called when hash.html is fully loaded.
		 * @param {String} channel The name of the channel
		 * @param {Function} callback The function to call
		 */
        registerOnReady: function(channel, callback){
            onReadyCallbacks[channel] = callback;
        },
		/**
		 * Call the onReady method associated with the channel
		 * @param {String} channel The name of the channel
		 */
        onReady: function(channel){
            var fn = this.onReadyCallbacks[channel];
            if (fn) {
                fn();
                delete onReadyCallbacks[channel];
            }
        }
    };
}());
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
     * <a href="https://developer.mozilla.org/en/DOM/window.postMessage>https://developer.mozilla.org/en/DOM/window.postMessage</a>
     * @param {easyXSS.Transport.TransportConfiguration} config The transports configuration.
     * @class
     */
    PostMessageTransport: function(config){
        /// <summary>
        /// Sets up the infrastructure for sending and receiving 
        /// messages using the window.postMessage interface.
        /// http://msdn.microsoft.com/en-us/library/ms644944(VS.85).aspx
        /// https://developer.mozilla.org/en/DOM/window.postMessage
        /// </summary
        /// <param name="config" type="object"></param>
        /// <returns type="object">An object able to send and receive strings</returns>
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
        /// <summary>
        /// Sets up the infrastructure for sending and receiving 
        /// messages using the the IFrame URI Technique.
        /// </summary
        /// <param name="config" type="object"></param>
        /// <returns type="object">An object able to send and receive strings</returns>
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
                _callerWindow.src = _remoteUrl + "#" + (_msgNr++) + "_" + encodeURIComponent(message);
            },
			/**
			 * 
			 */
            destroy: function(){
                window.clearInterval(_timer);
                _callerWindow.parentNode.removeChild(_callerWindow);
                _callerWindow = null;
            }
        };
    }
};


/**
 * Contains classes related to the interface implementation
 * @namespace
 */
easyXSS.Interface = {

    /**
     * The interface configuration
     * @class
     */
    InterfaceConfiguration: {
        /**
         * The local property contains a list of method-definitions in the form of methodname:{implementation}
         * @type easyXSS.Interface.LocalConfiguration
         */
        local: {},
        /**
         * The remote property contains a list of method-definitions in the form of methodname:{description}
         * @type easyXSS.Interface.RemoteConfiguration
         */
        remote: {}
    },
    /**
     * The configuration for the local property
     * @class
     */
    LocalConfiguration: {
        /**
         * A method returning data
         * @type easyXSS.Interface.Methods.LocalMethod
         */
        methodName: {},
        /**
         * A method not returning any data
         * @type easyXSS.Interface.Methods.LocalVoidMethod
         */
        voidMethodName: {},
        /**
         * An asynchronous method that is unable to return data immediately
         * This can for instance be a method using an xmlHttpRequest object to retrieve data
         * @type easyXSS.Interface.Methods.LocalAsyncMethod
         */
        asyncMethodName: {}
    },
    /**
     * The configuration for the remote property
     * @class
     */
    RemoteConfiguration: {
        /**
         * Methods are by default expected to return data
         * @type easyXSS.Interface.Methods.RemoteMethod
         */
        methodName: {},
        /**
         * We do not expect any data back from this method
         * @type easyXSS.Interface.Methods.RemoteVoidMethod
         */
        voidMethodName: {},
        /**
         * We do not need to know that the remote method is implemented asynchronous
         * @type easyXSS.Interface.Methods.RemoteAsyncMethod
         */
        asyncMethodName: {}
    },
    /**
     * Contains description on the various method descriptions
     * @namespace
     */
    Methods: {
        /**
         * A method returning data
         * @class
         */
        LocalMethod: {
            /**
             * The implementation
             * @param {Object} arg1
             * @param {Object} arg2
             * @param {Object} argN
             * @return The methods return value
             */
            method: function(arg1, arg2, argN){
            }
        },
        /**
         * A method not returning any data
         * @class
         */
        LocalVoidMethod: {
            /**
             * If the method does not return anything then we mark it as void
             * @property
             */
            isVoid: true,
            /**
             * The implementation
             * @param {Object} arg1
             * @param {Object} arg2
             * @param {Object} argN
             */
            method: function(arg1, arg2, argN){
            }
        },
        /**
         * An asynchronous method that is unable to return data immediately
         * This can for instance be a method using an xmlHttpRequest object to retrieve data
         * @class
         */
        LocalAsyncMethod: {
            /**
             * If the method is asyncronous we mark it as async
             * This is so that the framework will know that it expects a callback function
             */
            isAsync: true,
            /**
             * The implementation
             * @param {Object} arg1
             * @param {Object} arg2
             * @param {Object} argN
             * @param {Function} callback
             */
            method: function(arg1, arg2, argN, callback){
            }
        },
		/**
		 * Methods are by default expected to return data
		 * @class
		 */
        RemoteMethod: {},
		/**
		 * We do not expect any data back from this method
		 * @class
		 */
        RemoteVoidMethod: {
            /**
             * We mark the method as void so that the framework will not wait for any response, and will not expect a callback method
             */
            isVoid: true
        },
		/**
		 * We do not need to know that the remote method is implemented asynchronous
		 * @class
		 */
        RemoteAsyncMethod: {}
    }
};
/** 
 * Contains methods for dealing with url's
 * @class
 */
easyXSS.Url = {
    /**
     * A hashtable that gives access to the documents query string
     * The hashtable is cached internally
     * @returns A hashtable populated with keys and values from the querystring
     * @type {Object}
     */
    Query: function(){
        if (this._query) {
            return this._query;
        }
        this._query = {};
        var pair, key, value, search = location.search.substring(1).split("&");
        for (var i = 0, len = search.length; i < len; i++) {
            pair = search[i];
            key = pair.substring(0, pair.indexOf("="));
            value = pair.substring(key.length + 1);
            this._query[key] = value;
        }
        return this._query;
    },
    /**
     * Get the domain name from a url
     * @param {String} url The url to extract the domain from
     * @returns The domain part of the url
     * @type {String}
     */
    getDomainName: function(url){
        var domain = url.substring(url.indexOf("//") + 2);
        domain = domain.substring(0, domain.indexOf("/"));
        var _indexOf = domain.indexOf(":");
        if (_indexOf != -1) {
            domain = domain.substring(0, _indexOf);
        }
        return domain;
    },
    /**
     * Returns  a string containing the schema, domain and if present the port
     * @param {String} url The url to extract the location from
     * @returns The location part of the url
     * @type {String}
     */
    getLocation: function(url){
        var indexOf = url.indexOf("//");
        var loc = url.substring(indexOf + 2);
        loc = loc.substring(0, loc.indexOf("/"));
        return url.substring(0, indexOf + 2) + loc;
    }
};
/** 
 * Contains serializers for serializing and deserializing messages
 * @namespace 
 */
easyXSS.Serializing = {
    /**
     * The Interface implemented by all serializers
     */
    ISerializer: {
        /**
         * Serializes an object and returns it as a string
         * @param {Object} data The data to serialize
         * @returns The serialized string
         * @type {String}
         */
        stringify: function(data){
        
        },
        /**
         * Deserializes a string and returns an object
         * @param {String} message The string to deserialize
         * @returns An object
         * @type {Object}
         */
        parse: function(message){
        
        }
    },
    /**
     * A serializer that can convert to and from hashtables
     * It uses the same format as the query string for its serialized data
     * @class
     */
    hashTableSerializer: {
        /**
         * Serializes a hashtable and returns it as a string
         * @param {Object} data The data to serialize
         * @returns The serialized string
         * @type {String}
         */
        stringify: function(data){
            var message = "";
            for (var key in data) {
                message += key + "=" + escape(data[key]) + "&";
            }
            return message.substring(0, message.length - 1);
        },
        /**
         * Deserializes a string and returns a hashtable
         * @param {String} message The string to deserialize
         * @returns An hashtable populated with key-value pairs
         * @type {Object}
         */
        parse: function(message){
            var data = {};
            var d = message.split("&");
            var pair, key, value;
            for (var i = 0, len = d.length; i < len; i++) {
                pair = d[i];
                key = pair.substring(0, pair.indexOf("="));
                value = pair.substring(key.length + 1);
                data[key] = unescape(value);
            }
            return data;
        }
    }
};
