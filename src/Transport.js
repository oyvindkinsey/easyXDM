/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/**
 * @class easyXDM.Transport
 * This class creates a transport channel between two domains that is usable for sending and receiving string-based messages.<br/>
 * The channel is reliable, supports queueing, and ensures that the message originates from the expected domain.<br/>
 * Internally different stacks will be used depending on the browsers features and the available parameters. 
 * @namespace easyXDM
 * @constructor
 * @cfg {String/Window} local The url to the local hash.html document, a local static file, or a reference to the local window.
 * @cfg {String} remote The url to the providers document.
 * @cfg {String} remoteHelper The url to the remote hash.html file. This is to support NameTransport as a fallback. Optional.
 * @cfg {Number} readyAfter The number of milliseconds to wait before firing onReady. To support using static files instead of hash.html. Optional.
 * @cfg {String} channel The name of the channel to use. Must be unique. Optional if only a single channel is expected in the document.
 * @cfg {Function} onMessage The method that should handle incoming messages.<br/> This method should accept two arguments, the message as a string, and the origin as a string. Optional.
 * @cfg {Function} onReady A method that should be called when the transport is ready. Optional.
 * @cfg {DOMElement} container The element that the primary iframe should be inserted into. If not set then the iframe will be positioned off-screen. Optional.
 */
easyXDM.Transport = function(config){
    var stack = easyXDM.createStack(easyXDM.prepareTransportStack(config).concat([{
        incoming: function(message, origin){
            config.onMessage(message, origin);
        },
        callback: function(success){
            if (config.onReady) {
                config.onReady(success);
            }
        }
    }])), recipient = easyXDM.Url.getLocation(config.remote);
	
	/**
	 * Initiates the destruction of the stack.
	 */
    this.destroy = function(){
        stack.destroy();
    };
	
	/**
	 * Posts a message to the remote end of the channel
	 * @param {String} message The message to send
	 */
    this.postMessage = function(message){
        stack.outgoing(message, recipient);
    };
	
    stack.init();
};
