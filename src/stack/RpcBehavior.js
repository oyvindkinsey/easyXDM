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
        // Add the scope so that calling the methods will work as expected
        if (undef(definition.scope)) {
            definition.scope = window;
        }
        if (definition.isVoid) {
            // #ifdef debug
            trace("creating void method " + method);
            // #endif
            // No need to register a callback
            return function(){
                // #ifdef debug
                trace("executing void method " + method);
                // #endif
                var params = Array.prototype.slice.call(arguments, 0);
                // Send the method request
                pub.down.outgoing(serializer.stringify({
                    id: null,
                    method: method,
                    params: params
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
                var l = arguments.length, callback, args, slice = Array.prototype.slice;
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
    function _executeMethod(method, id, fn, params){
        if (!method) {
            throw new Error("The method " + method + " is not implemented.");
        }
        if (fn.isAsync) {
            // #ifdef debug
            trace("requested to execute async method " + method);
            // #endif
            // The method is async, we need to add a callback
            params.push(function(result){
                // Send back the result
                pub.down.outgoing(serializer.stringify({
                    id: id,
                    result: result,
                    error: null
                }));
            });
            params.push(function(error){
                // Send back the result
                pub.down.outgoing(serializer.stringify({
                    id: id,
                    result: null,
                    error: error
                }));
            });
            // Call local method
            fn.method.apply(fn.scope, params);
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
                        id: id,
                        result: fn.method.apply(fn.scope, params),
                        error: null
                    };
                } 
                catch (ex) {
                    response = {
                        id: id,
                        result: null,
                        error: ex.message
                    };
                }
                pub.down.outgoing(serializer.stringify(response));
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
                _executeMethod(data.method, data.id, config.local[data.method], data.params);
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
