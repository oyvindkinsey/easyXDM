/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, undef */

/**
 * @class easyXDM.stack.RpcBehavior
 * This uses a protocol similar to JSON-RPC to expose local methods and to invoke remote methods and have responses returned over the the string based transport stack.<br/>
 * Local methods can be both asynchronous and synchronous.<br/>
 * Remote methods can be set up to return a response or not.
 * @extends easyXDM.stack.StackElement
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} proxy The object to apply the methods to.
 * @param {easyXDM.configuration.RpcConfiguration} config The definition of the local and remote interface to implement.
 * @cfg {easyXDM.configuration.LocalConfiguration} local The local interface to expose.
 * @cfg {easyXDM.configuration.RemoteConfiguration} remote The remote methods to expose through the proxy.
 * @cfg {Object} serializer The serializer to use for serializing and deserializing the JSON. Should be compatible with the HTML5 JSON object. Optional, will default to window.JSON.
 */
easyXDM.stack.RpcBehavior = function(proxy, config){
    // #ifdef debug
    var trace = easyXDM.Debug.getTracer("easyXDM.stack.RpcBehavior");
    // #endif
    var pub, serializer = config.serializer || window.JSON;
    var _callbackCounter = 0, _callbacks = {};
    
    /**
     * Creates a method that implements the given definition
     * @private
     * @param {easyXDM.configuration.Methods.Method} The method configuration
     * @param {String} method The name of the method
     */
    function _createMethod(definition, method){
        var slice = Array.prototype.slice;
        if (definition.isVoid) {
            // #ifdef debug
            trace("creating void method " + method);
            // #endif
            // No need to register a callback
            return function(){
                // #ifdef debug
                trace("executing void method " + method);
                // #endif
                // Send the method request
                pub.down.outgoing(serializer.stringify({
                    id: null,
                    method: method,
                    params: slice.call(arguments, 0)
                }));
            };
        }
        else {
            // #ifdef debug
            trace("creating method " + method);
            // #endif
            // We need to extract and register the callback
            return function(){
                // #ifdef debug
                trace("executing method " + method);
                // #endif
                var l = arguments.length, callback, args;
                if (l > 1 && typeof arguments[l - 2] === "function") {
                    callback = {
                        success: arguments[l - 2],
                        error: arguments[l - 1]
                    };
                    args = slice.call(arguments, 0, l - 2);
                }
                else if (l > 0) {
                    callback = {
                        success: arguments[l - 1]
                    };
                    args = slice.call(arguments, 0, l - 1);
                }
                _callbacks["" + (++_callbackCounter)] = callback;
                // Send the method request
                pub.down.outgoing(serializer.stringify({
                    method: method,
                    id: _callbackCounter,
                    params: args
                }));
            };
        }
    }
    
    /**
     * Executes the exposed method
     * @private
     * @param {String} method The name of the method
     * @param {Number} id The callback id to use
     * @param {Function} method The exposed implementation
     * @param {Array} params The parameters supplied by the remote end
     */
    function _executeMethod(method, id, fn, params, reply){
        if (!fn) {
            // no such method
            reply({
                jsonrpc: "2.0",
                id: id,
                error: {
                    code: -32601
                }
            });
            return;
        }
        if (fn.isAsync) {
            // #ifdef debug
            trace("requested to execute async method " + method);
            // #endif
            // The method is async, we need to add a success callback
            params.push(function(result){
                // Send back the result
                reply({
                    jsonrpc: "2.0",
                    id: id,
                    result: result
                });
            });
            // and an error callback
            params.push(function(message){
                // Send back the result
                reply({
                    jsonrpc: "2.0",
                    id: id,
                    error: {
                        code: 32099,
                        message: message
                    }
                });
            });
            // Call local method
            try {
                fn.method.apply(fn.scope, params);
            } 
            catch (ex1) {
                reply({
                    jsonrpc: "2.0",
                    id: id,
                    error: {
                        code: 32099,
                        message: ex1.message
                    }
                });
            }
        }
        else {
            if (fn.isVoid) {
                // #ifdef debug
                trace("requested to execute void method " + method);
                // #endif
                // Call local method 
                fn.method.apply(fn.scope, params);
            }
            else {
                // #ifdef debug
                trace("requested to execute method " + method);
                // #endif
                // Call local method and send back the response
                var response;
                try {
                    response = {
                        jsonrpc: "2.0",
                        id: id,
                        result: fn.method.apply(fn.scope, params)
                    };
                } 
                catch (ex2) {
                    response = {
                        jsonrpc: "2.0",
                        id: id,
                        error: {
                            code: 32099,
                            message: ex2.message
                        }
                    };
                }
                reply(response);
            }
        }
    }
    
    return (pub = {
        incoming: function(message, origin){
            var data = serializer.parse(message);
            if (data.method) {
                // #ifdef debug
                trace("received request to execute method " + data.method + (data.id ? (" using callback id " + data.id) : ""));
                // #endif
                // A method call from the remote end
                var reply = function(data){
                    pub.down.outgoing(serializer.stringify(data));
                };
                if (config.handle) {
                    config.handle(data, reply);
                }
                else {
                    _executeMethod(data.method, data.id, config.local[data.method], data.params, reply);
                }
            }
            else {
                // #ifdef debug
                trace("received return value destined to callback with id " + data.id);
                // #endif
                // A method response from the other end
                var callback = _callbacks[data.id];
                if (data.result && callback.success) {
                    callback.success(data.result);
                }
                else if (data.error) {
                    if (callback.error) {
                        callback.error(data.error);
                    }
                    // #ifdef debug
                    else {
                        trace("unhandled error returned.");
                    }
                    // #endif
                }
                delete _callbacks[data.id];
            }
        },
        init: function(){
            // #ifdef debug
            trace("init");
            // #endif
            if (config.remote) {
                // #ifdef debug
                trace("creating concrete implementations");
                // #endif
                // Implement the remote sides exposed methods
                for (var method in config.remote) {
                    if (config.remote.hasOwnProperty(method)) {
                        proxy[method] = _createMethod(config.remote[method], method);
                    }
                }
            }
            pub.down.init();
        },
        destroy: function(){
            // #ifdef debug
            trace("destroy");
            // #endif
            for (var method in config.remote) {
                if (config.remote.hasOwnProperty(method) && proxy.hasOwnProperty(method)) {
                    delete proxy[method];
                }
            }
            pub.down.destroy();
        }
    });
};
