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
     * @param {String} name The name of the method
     */
    function _createMethod(definition, name){
        // Add the scope so that calling the methods will work as expected
        if (undef(definition.scope)) {
            definition.scope = window;
        }
        if (definition.isVoid) {
            // #ifdef debug
            trace("creating void method " + name);
            // #endif
            // No need to register a callback
            return function(){
                // #ifdef debug
                trace("executing void method " + name);
                // #endif
                var params = Array.prototype.slice.call(arguments, 0);
                // Send the method request
                setTimeout(function(){
                    pub.down.outgoing(serializer.stringify({
                        name: name,
                        params: params
                    }));
                }, 0);
            };
        }
        else {
            // #ifdef debug
            trace("creating method " + name);
            // #endif
            // We need to extract and register the callback
            return function(){
                // #ifdef debug
                trace("executing method " + name);
                // #endif
                _callbacks["" + (++_callbackCounter)] = arguments[arguments.length - 1];
                var request = {
                    name: name,
                    id: (_callbackCounter),
                    params: Array.prototype.slice.call(arguments, 0, arguments.length - 1)
                };
                // Send the method request
                pub.down.outgoing(serializer.stringify(request));
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
            throw new Error("The method " + name + " is not implemented.");
        }
        if (method.isAsync) {
            // #ifdef debug
            trace("requested to execute async method " + name);
            // #endif
            // The method is async, we need to add a callback
            params.push(function(result){
                // Send back the result
                pub.down.outgoing(serializer.stringify({
                    id: id,
                    response: result
                }));
            });
            // Call local method
            method.method.apply(method.scope, params);
        }
        else {
            if (method.isVoid) {
                // #ifdef debug
                trace("requested to execute void method " + name);
                // #endif
                // Call local method 
                method.method.apply(method.scope, params);
            }
            else {
                // #ifdef debug
                trace("requested to execute method " + name);
                // #endif
                // Call local method and send back the response
                pub.down.outgoing(serializer.stringify({
                    id: id,
                    response: method.method.apply(method.scope, params)
                }));
            }
        }
    }
    
    return (pub = {
        incoming: function(message, origin){
            var data = serializer.parse(message);
            if (data.name) {
                // #ifdef debug
                trace("received request to execute method " + data.name + (data.id ? (" using callback id " + data.id) : ""));
                // #endif
                // A method call from the remote end
                _executeMethod(data.name, data.id, config.local[data.name], data.params);
            }
            else {
                // #ifdef debug
                trace("received return value destined to callback with id " + data.id);
                // #endif
                // A method response from the other end
                _callbacks[data.id](data.response);
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
                for (var name in config.remote) {
                    if (config.remote.hasOwnProperty(name)) {
                        proxy[name] = _createMethod(config.remote[name], name);
                    }
                }
            }
            pub.down.init();
        },
        destroy: function(){
            // #ifdef debug
            trace("destroy");
            // #endif
            for (var x in proxy) {
                if (proxy.hasOwnProperty(x)) {
                    delete proxy[x];
                }
            }
            pub.down.destroy();
        }
    });
};
