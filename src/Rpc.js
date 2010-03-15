/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/** 
 * @class easyXDM.Rpc
 * Creates a proxy object that can be used to call methods implemented on the remote end of the channel, and also to provide the implementation
 * of methods to be called from the remote end.<br/>
 * The instantiated object will have methods matching those specified in <code>config.remote</code>.<br/>
 * This requires the JSON object present in the document, either natively, using json.org's json2 or as a wrapper around library spesific methods.
 * @namespace easyXDM
 * @constructor
 * @param {Object} config The underlying transports configuration. See easyXDM.Transport for available parameters.
 * @param {easyXDM.configuration.RpcConfiguration} jsonRpcConfig The description of the interface to implement.
 */
easyXDM.Rpc = function(config, jsonRpcConfig){
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
