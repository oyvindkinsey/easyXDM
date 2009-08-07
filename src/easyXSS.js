
/*jslint evil:true, browser: true, forin: true, immed: true, passfail: true, undef: true */
/*global window, escape, unescape */

/** 
 * @class easyXSS
 * A javascript library providing cross-browser, cross-site messaging/method invocation.
 * easyXSS.Debug and the easyXSS.Configuration namespace is only available in the debug version.
 * @version %%version%%
 * @singleton
 */
var easyXSS = {
    /**
     * The version of the library
     * @type {String}
     */
    version: "%%version%%",
    /** 
     * @class easyXSS.Interface
     * Creates an interface that can be used to call methods implemented
     * on the remote end of the channel, and also to provide the implementation
     * of methods to be called from the remote end.
     * @constructor
     * @param {easyXSS.Configuration.ChannelConfiguration} channelConfig The underlying channels configuration.
     * @param {easyXSS.Configuration.InterfaceConfiguration} config The description of the interface to implement
     * @param {Function} onReady A method that should be called when the interface is ready
     * @namespace easyXSS
     */
    Interface: function(channelConfig, config, onReady){
        // #ifdef debug
        easyXSS.Debug.trace("creating new interface");
        // #endif
        var channel;
        var _callbackCounter = 0, _callbacks = {};
        
        /**
         * Creates a method that implements the given definition
         * @private
         * @param {easyXSS.Configuration.Methods.Method} The method configuration
         * @param {String} name The name of the method
         */
        function _createMethod(definition, name){
            if (definition.isVoid) {
                // #ifdef debug
                easyXSS.Debug.trace("creating void method " + name);
                // #endif
                // No need to register a callback
                return function(){
                    // #ifdef debug
                    easyXSS.Debug.trace("executing void method " + name);
                    // #endif
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
                // #ifdef debug
                easyXSS.Debug.trace("creating method " + name);
                // #endif
                // We need to extract and register the callback
                return function(){
                    // #ifdef debug
                    easyXSS.Debug.trace("executing method " + name);
                    // #endif
                    _callbacks["" + (++_callbackCounter)] = arguments[arguments.length - 1];
                    var request = {
                        name: name,
                        id: (_callbackCounter),
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
        
        /**
         * Executes the exposed method
         * @private
         * @param {String} name The name of the method
         * @param {Number} id The callback id to use
         * @param {Function} method The exposed implementation
         * @param {Array} params The parameters supplied by the remote end
         */
        function _executeMethod(name, id, method, params){
            if (!method) {
                throw "The method " + name + " is not implemented.";
            }
            if (method.isAsync) {
                // #ifdef debug
                easyXSS.Debug.trace("requested to execute async method " + name);
                // #endif
                // The method is async, we need to add a callback
                params.push(function(result){
                    // Send back the result
                    channel.sendData({
                        id: id,
                        response: result
                    });
                });
                // Call local method
                method.method.apply(null, params);
            }
            else {
                if (method.isVoid) {
                    // #ifdef debug
                    easyXSS.Debug.trace("requested to execute void method " + name);
                    // #endif
                    // Call local method 
                    method.method.apply(null, params);
                }
                else {
                    // #ifdef debug
                    easyXSS.Debug.trace("requested to execute method " + name);
                    // #endif
                    // Call local method and send back the response
                    channel.sendData({
                        id: id,
                        response: method.method.apply(null, params)
                    });
                }
            }
        }
        
        channelConfig.converter = JSON;
        
        /**
         * Handles incoming data
         * @private
         * @param {Object} data The JSON data object
         * @param {String} origin
         */
        channelConfig.onData = function(data, origin){
            // #ifdef debug
            easyXSS.Debug.trace("interface$_onData:(" + data + "," + origin + ")");
            // #endif
            /// <summary>
            /// Receives either a request or a response from the other
            /// end of the channel
            /// </summary>
            /// <param name="data" type="object">The request/repsonse</param>
            if (data.name) {
                // #ifdef debug
                easyXSS.Debug.trace("received request to execute method " + data.name + " using callback id " + data.id);
                // #endif
                // A method call from the remote end
                _executeMethod(data.name, data.id, config.local[data.name], data.params);
            }
            else {
                // #ifdef debug
                easyXSS.Debug.trace("received return value destined to callback with id " + data.id);
                // #endif
                // A method response from the other end
                _callbacks[data.id](data.response);
                delete _callbacks[data.id];
            }
        };
        
        channel = new easyXSS.Channel(channelConfig, onReady);
        
        /**
         * The underlying channel used by the interface
         */
        this.channel = channel;

		/**
		 * Tries to destroy the underlying channel and to remove all traces of the interface.
		 */
        this.destroy = function(){
            this.channel.destroy();
            for (var x in this) {
                delete this[x];
            }
        };
		
        if (config.remote) {
            // #ifdef debug
            easyXSS.Debug.trace("creating concrete implementations");
            // #endif
			// Implement the remote sides exposed methods
            for (var name in config.remote) {
                this[name] = _createMethod(config.remote[name], name);
            }
        }
    },
    /**
     * @class easyXSS.Channel
     * A channel
     * @param {easyXSS.ChannelConfiguration} config The channels configuration
     * @param {Function} onReady A method that should be called when the channel is ready
     * @namespace easyXSS
     * @constructor
     */
    Channel: function(config, onReady){
        // #ifdef debug
        easyXSS.Debug.trace("easyXSS.Channel.constructor");
        // #endif
        if (!config.converter) {
            throw "No converter present. You should use the easyXSS.Transport classes directly.";
        }
        /**
         * Wraps the transports onMessage method using the supplied serializer to convert
         * @param {Object} data
         * @ignore
         */
        config.onMessage = function(message, origin){
            this.onData(this.converter.parse(message), origin);
        };
        
        return {
            /**
             * The underlying transport used by this channel
             * @type easyXSS.Transport.ITransport
             */
            transport: new easyXSS.Transport.BestAvailableTransport(config, onReady),
            /**
             * Tries to destroy the underlying transport
             */
            destroy: function(){
                // #ifdef debug
                easyXSS.Debug.trace("easyXSS.Channel.destroy");
                // #endif
                this.transport.destroy();
            },
            /**
             * Send data using the underlying transport
             * If a serializer is specified then this will be used to serialize the data first.
             * @param {Object} data
             */
            sendData: function(data){
                this.transport.postMessage(config.converter.stringify(data));
            }
        };
    }
};

// #ifdef debug
/**
 * @class easyXSS.Debug
 * Utilities for debugging. This class is only precent in the debug version.
 * @namespace easyXSS
 */
easyXSS.Debug = {
    /**
     * Logs the message to console.log if available
     * @param {String} msg The message to log
     */
    log: function(msg){
        // Uses memoizing to cache the implementation
        var log;
        if (console === "undefined" || console.log === "undefiend") {
            /**
             * Sets log to be an empty function since we have no output available
             * @ignore
             */
            log = function(){
            };
        }
        else {
            /**
             * Sets log to be a wrapper around console.log
             * @ignore
             * @param {String} msg
             */
            log = function(msg){
                console.log(location.host + ":" + msg);
            };
        }
        log(msg);
        easyXSS.Debug.log = log;
    },
    /**
     * Will try to trace the given message either to a DOMElement with the id "log",
     * or by using console.info.
     * @param {String} msg The message to trace
     */
    trace: function(msg){
        // Uses memoizing to cache the implementation
        var trace;
        var el = document.getElementById("log");
        if (el) {
            /**
             * Sets trace to be a function that outputs the messages to the DOMElement with id "log"
             * @ignore
             * @param {String} msg
             */
            trace = function(msg){
                el.appendChild(document.createElement("div")).appendChild(document.createTextNode(location.host + ":" + msg));
                el.scrollTop = el.scrollHeight;
            };
        }
        else {
            if (console === "undefined") {
                /**
                 * Sets trace to be an empty function
                 * @ignore
                 */
                trace = function(){
                };
            }
            else {
                /**
                 * Sets trace to be a wrapper around console.info
                 * @ignore
                 * @param {String} msg
                 */
                trace = function(msg){
                    console.info(location.host + ":" + msg);
                };
            }
        }
        trace(location.host + ":" + msg);
        easyXSS.Debug.trace = trace;
    }
};
// #endif
