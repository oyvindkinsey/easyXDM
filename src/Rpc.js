/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, undef, JSON */

/** 
 * @class easyXDM.Rpc
 * Creates a proxy object that can be used to call methods implemented on the remote end of the channel, and also to provide the implementation
 * of methods to be called from the remote end.<br/>
 * The instantiated object will have methods matching those specified in <code>config.remote</code>.<br/>
 * This requires the JSON object present in the document, either natively, using json.org's json2 or as a wrapper around library spesific methods.
 * @namespace easyXDM
 * @constructor
 * @param {Object} config The underlying transports configuration. See easyXDM.Socket for available parameters.
 * @param {easyXDM.configuration.RpcConfiguration} jsonRpcConfig The description of the interface to implement.
 */
easyXDM.Rpc = function(config, jsonRpcConfig){
    // #ifdef debug
    var trace = easyXDM.Debug.getTracer("easyXDM.Rpc");
    trace("constructor");
    // #endif
    
    //code to work around libraries like PrototypeJS that extend native objects and thereby breaks JSON's stringify method
    if (undef(jsonRpcConfig.serializer)) {
        var obj = {
            a: [1, 2, 3]
        }, json = "{\"a\":[1,2,3]}", impl;
        
        if (JSON && typeof JSON.stringify === "function" && JSON.stringify(obj).replace((/\s/g), "") === json) {
            // this is a working JSON instance
            impl = JSON;
        }
        else {
            impl = {};
            if (Object.toJSON) {
                if (Object.toJSON(obj).replace((/\s/g), "") === json) {
                    // this is a working stringify method
                    impl.stringify = Object.toJSON;
                }
            }
            
            if (typeof String.prototype.evalJSON === "function") {
                obj = json.evalJSON();
                if (obj.a && obj.a.length === 3 && obj.a[2] === 3) {
                    // this is a working parse method           
                    impl.parse = function(str){
                        return str.evalJSON();
                    };
                }
            }
            
            if (!impl.stringify || !impl.parse) {
                throw new Error("No usable JSON implementation");
            }
        }
        jsonRpcConfig.serializer = impl;
    }
    
    var stack = easyXDM.createStack(easyXDM.prepareTransportStack(config).concat([new easyXDM.stack.RpcBehavior(this, jsonRpcConfig), {
        callback: function(success){
            if (config.onReady) {
                config.onReady(success);
            }
        }
    }]));
    
    /**
     * Initiates the destruction of the stack.
     */
    this.destroy = function(){
        stack.destroy();
    };
    
    stack.init();
};
