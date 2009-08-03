
/*jslint evil:true, browser: true, forin: true, immed: true, passfail: true, undef: true */
/*global window, escape, unescape */

/** 
 * @class easyXSS
 * A javascript library providing cross-browser, cross-site messaging/method invocation
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
     * @method
     * @param {easyXSS.Transport.TransportConfiguration} config The transports configuration
     * @param {Function} onReady A method that should be called when the transport is ready
     * @return easyXSS.Transport.ITransport An object able to send and receive messages
     */
    createTransport: function(config, onReady){
        if (config.local) {
            config.channel = (config.channel) ? config.channel : "default";
        }
        else {
            var query = easyXSS.Url.Query();
            config.channel = query.channel;
            config.remote = query.endpoint;
        }
        // #ifdef debug
        easyXSS.Debug.trace("creating transport for channel " + config.channel);
        // #endif
        if (window.postMessage) {
            return new easyXSS.Transport.PostMessageTransport(config, onReady);
        }
        else {
            return new easyXSS.Transport.HashTransport(config, onReady);
        }
    },
    /** 
     * @class easyXSS.Interface
     * Creates an interface that can be used to call methods implemented
     * on the remote end of the channel, and also to provide the implementation
     * of methods to be called from the remote end.
     * @requires JSON
     * @param {String} channel A valid channel for transportation
     * @param {easyXSS.Configuration.InterfaceConfiguration} config A valid easyXSS-definition
     * @param {Function} onReady A method that should be called when the interface is ready
     * @namespace easyXSS
     * @constructor
     */
    Interface: function(channel, config, onReady){
        // #ifdef debug
        easyXSS.Debug.trace("creating new interface");
        // #endif
        var _callbackCounter = 0, _callbacks = {};
        var _local = (config.local) ? config.local : null;
        
        function _onData(data, origin){
            // #ifdef debug
            easyXSS.Debug.trace("interface$_onData:(" + data + "," + origin + ")");
            // #endif
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
                    // #ifdef debug
                    easyXSS.Debug.trace("requested to execute async method " + data.name);
                    // #endif
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
                        // #ifdef debug
                        easyXSS.Debug.trace("requested to execute void method " + data.name);
                        // #endif
                        // Call local method 
                        method.method.apply(null, data.params);
                    }
                    else {
                        // #ifdef debug
                        easyXSS.Debug.trace("requested to execute method " + data.name);
                        // #endif
                        // Call local method and send back the response
                        channel.sendData({
                            id: data.id,
                            response: method.method.apply(null, data.params)
                        });
                    }
                }
            }
            else {
                // #ifdef debug
                easyXSS.Debug.trace("received return value destined to callback with id " + data.id);
                // #endif
                // A method response from the other end
                _callbacks[data.id](data.response);
                delete _callbacks[data.id];
            }
        }
        
        function _createRemote(methods){
            // #ifdef debug
            easyXSS.Debug.trace("creating concrete implementations");
            // #endif
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
            var concrete = {};
            for (var name in methods) {
                concrete[name] = _createConcrete(methods[name], name);
            }
            return concrete;
        }
        channel.setOnData(_onData);
        channel.setConverter(JSON);
        if (onReady) {
            window.setTimeout(onReady, 10);
        }
        
        return (config.remote) ? _createRemote(config.remote) : null;
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
        var sendData;
        if (config.converter) {
            // #ifdef debug
            easyXSS.Debug.trace("implementing serializer");
            // #endif
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
            transport: easyXSS.createTransport(/** easyXSS.Transport.TransportConfiguration*/config, onReady),
            /**
             * Sets the serializer to be used when transmitting and receiving messages
             * @param {Object} converter The serializer to use
             */
            setConverter: function(converter){
                // #ifdef debug
                easyXSS.Debug.trace("implementing serializer after initialization");
                // #endif
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
                // #ifdef debug
                easyXSS.Debug.trace("overriding onData after intialization");
                // #endif
                config.onData = onData;
            },
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
            sendData: sendData
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
