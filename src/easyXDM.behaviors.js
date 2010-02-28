/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, JSON */

/**
 * The namespace for the behaviors
 */
easyXDM.behaviors = {};

easyXDM.behaviors.RPCBehavior = function(proxy, settings){
    var pub;
    var _callbackCounter = 0, _callbacks = {};
    
    /**
     * Creates a method that implements the given definition
     * @private
     * @param {easyXDM.configuration.Methods.Method} The method configuration
     * @param {String} name The name of the method
     */
    function _createMethod(definition, name){
        // Add the scope so that calling the methods will work as expected
        if (typeof definition.scope === "undefined") {
            definition.scope = window;
        }
        if (definition.isVoid) {
            // #ifdef debug
            easyXDM.Debug.trace("creating void method " + name);
            // #endif
            // No need to register a callback
            return function(){
                // #ifdef debug
                easyXDM.Debug.trace("executing void method " + name);
                // #endif
                var params = Array.prototype.slice.call(arguments, 0);
                // Send the method request
                window.setTimeout(function(){
                    pub.down.outgoing(JSON.stringify({
                        name: name,
                        params: params
                    }));
                }, 0);
            };
        }
        else {
            // #ifdef debug
            easyXDM.Debug.trace("creating method " + name);
            // #endif
            // We need to extract and register the callback
            return function(){
                // #ifdef debug
                easyXDM.Debug.trace("executing method " + name);
                // #endif
                _callbacks["" + (++_callbackCounter)] = arguments[arguments.length - 1];
                var request = {
                    name: name,
                    id: (_callbackCounter),
                    params: Array.prototype.slice.call(arguments, 0, arguments.length - 1)
                };
                // Send the method request
                pub.down.outgoing(JSON.stringify(request));
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
            easyXDM.Debug.trace("requested to execute async method " + name);
            // #endif
            // The method is async, we need to add a callback
            params.push(function(result){
                // Send back the result
                pub.down.outgoing(JSON.stringify({
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
                easyXDM.Debug.trace("requested to execute void method " + name);
                // #endif
                // Call local method 
                method.method.apply(method.scope, params);
            }
            else {
                // #ifdef debug
                easyXDM.Debug.trace("requested to execute method " + name);
                // #endif
                // Call local method and send back the response
                pub.down.outgoing(JSON.stringify({
                    id: id,
                    response: method.method.apply(method.scope, params)
                }));
            }
        }
    }
    
    return (pub = {
        incoming: function(message, origin){
            var data = JSON.parse(message);
            if (data.name) {
                // #ifdef debug
                easyXDM.Debug.trace("received request to execute method " + data.name + (data.id ? (" using callback id " + data.id) : ""));
                // #endif
                // A method call from the remote end
                _executeMethod(data.name, data.id, settings.local[data.name], data.params);
            }
            else {
                // #ifdef debug
                easyXDM.Debug.trace("received return value destined to callback with id " + data.id);
                // #endif
                // A method response from the other end
                _callbacks[data.id](data.response);
                delete _callbacks[data.id];
            }
        },
        outgoing: function(message, recipient){
            throw new Error("not implemented");
        },
        callback: function(success){
            pub.up.callback(success);
        },
        init: function(){
            if (settings.remote) {
                // #ifdef debug
                easyXDM.Debug.trace("creating concrete implementations");
                // #endif
                // Implement the remote sides exposed methods
                for (var name in settings.remote) {
                    if (settings.remote.hasOwnProperty(name)) {
                        proxy[name] = _createMethod(settings.remote[name], name);
                    }
                }
            }
            pub.down.init();
        },
        destroy: function(){
            for (var x in proxy) {
                if (proxy.hasOwnProperty(x)) {
                    delete proxy[x];
                }
            }
            pub.down.destroy();
        }
    });
};
