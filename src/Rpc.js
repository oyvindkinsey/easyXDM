/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/** 
 * @class easyXDM.Rpc
 * Creates an interface that can be used to call methods implemented
 * on the remote end of the channel, and also to provide the implementation
 * of methods to be called from the remote end.
 * @constructor
 * @param {easyXDM.configuration.ChannelConfiguration} channelConfig The underlying channels configuration.
 * @param {easyXDM.configuration.InterfaceConfiguration} config The description of the interface to implement
 * @param {Function} onReady A method that should be called when the interface is ready
 * @namespace easyXDM
 */
easyXDM.Rpc = function(config, jsonRpcConfig){
    var stack = easyXDM.createStack(easyXDM.prepareTransportStack(config).concat([new easyXDM.stack.RpcBehavior(this, jsonRpcConfig), {
        callback: function(success){
            if (config.onReady) {
                config.onReady(success);
            }
        }
    }]));
	
    this.destroy = function(){
        stack.destroy();
    };
    
    stack.init();
};
