/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM: true, window, escape, unescape */

/** 
 * @class easyXDM
 * A javascript library providing cross-browser, cross-domain messaging/RPC.<br/>
 * easyXDM.Debug and the easyXDM.configuration namespace is only available in the debug version.
 * @version %%version%%
 * @singleton
 */
easyXDM = {

    /**
     * The version of the library
     * @type {String}
     */
    version: "%%version%%",
    
    /**
     * Applies properties from the source object to the target object.<br/>
     * This is a destructive method.
     * @param {Object} target The target of the properties.
     * @param {Object} source The source of the properties.
     * @param {Boolean} onlyNew Set to True to only set non-existing properties.
     */
    apply: function(target, source, onlyNew){
        if (!source) {
            return;
        }
        for (var key in source) {
            if (source.hasOwnProperty(key) && (!onlyNew || !target[key])) {
                target[key] = source[key];
            }
        }
    },
    
    /**
     * Prepares an array of stack-elements suitable for the current configuration
     * @param {Object} config The Transports configuration. See easyXDM.Transport for more.
     * @return {Array} An array of stack-elements with the Transport element at index 0.
     */
    prepareTransportStack: function(config){
        // If no protocol is set then it means this is the host
        var query = easyXDM.Url.Query(), protocol = config.protocol, stackEls;
        config.isHost = (typeof query.xdm_p === "undefined");
        
        if (!config.isHost) {
            config.channel = query.xdm_c;
            config.remote = decodeURIComponent(query.xdm_e);
            protocol = query.xdm_p;
        }
        else if (typeof protocol === "undefined") {
            if (window.postMessage) {
                protocol = "1";
            }
            else if (config.remoteHelper) {
                protocol = "2";
            }
            else {
                protocol = "0";
            }
            config.channel = config.channel || "default";
        }
        
        switch (protocol) {
            case "0":// 0 = HashTransport
                config.interval = config.interval || 300;
                config.useResize = true;
                config.useParent = false;
                config.usePolling = false;
                if (config.isHost) {
                    var parameters = {
                        xdm_c: config.channel,
                        xdm_p: 0
                    };
                    if (config.local === window) {
                        // We are using the current window to listen to
                        config.usePolling = true;
                        config.useParent = true;
                        parameters.xdm_e = encodeURIComponent(config.local = location.protocol + "//" + location.host + location.pathname + location.search);
                        parameters.xdm_pa = 1; // use parent
                    }
                    else {
                        parameters.xdm_e = easyXDM.Url.resolveUrl(config.local);
                    }
                    if (config.container) {
                        config.useResize = false;
                        parameters.xdm_po = 1; // use polling
                    }
                    config.remote = easyXDM.Url.appendQueryParameters(config.remote, parameters);
                }
                else {
                    config.channel = query.xdm_c;
                    config.remote = decodeURIComponent(query.xdm_e);
                    config.useParent = (typeof query.xdm_pa !== "undefined");
                    if (config.useParent) {
                        config.useResize = false;
                    }
                    config.usePolling = (typeof query.xdm_po !== "undefined");
                }
                stackEls = [new easyXDM.stack.HashTransport(config), new easyXDM.stack.ReliableBehavior({
                    timeout: ((config.useResize ? 50 : config.interval * 1.5) + (config.usePolling ? config.interval * 1.5 : 50))
                }), new easyXDM.stack.QueueBehavior({
                    maxLength: 4000 - config.remote.length
                }), new easyXDM.stack.VerifyBehavior({
                    initiate: config.isHost
                })];
                break;
            case "1":
                stackEls = [new easyXDM.stack.PostMessageTransport(config)];
                break;
            case "2":
                stackEls = [new easyXDM.stack.NameTransport(config), new easyXDM.stack.QueueBehavior(), new easyXDM.stack.VerifyBehavior({
                    initiate: config.isHost
                })];
                break;
        }
        
        return stackEls;
    },
    
    /**
     * Chains all the separate stack elements into a single usable stack.<br/>
     * If an element is missing a necessary method then it will have a pass-through method applied.
     * @param {Array} stackElements An array of stack elements to be linked.
     * @return {easyXDM.stack.StackElement} The last element in the chain.
     */
    createStack: function(stackElements){
        var stackEl, defaults = {
            incoming: function(message, origin){
                this.up.incoming(message, origin);
            },
            outgoing: function(message, recipient){
                this.down.outgoing(message, recipient);
            },
            callback: function(success){
                this.up.callback(success);
            },
            init: function(){
                this.down.init();
            },
            destroy: function(){
                this.down.destroy();
            }
        };
        for (var i = 0, len = stackElements.length; i < len; i++) {
            stackEl = stackElements[i];
            this.apply(stackEl, defaults, true);
            if (i !== 0) {
                stackEl.down = stackElements[i - 1];
            }
            if (i !== len - 1) {
                stackEl.up = stackElements[i + 1];
            }
        }
        return stackEl;
    }
};


// #ifdef debug
/**
 * The namespace for all stack elements.
 * @private
 */
easyXDM.stack = {

    /**
     * @class easyXDM.stack.StackElement
     * The base interface that all stack elements should follow.<br/>
     * Only the relevant methods needs to be implemented as the framework will add pass-through methods where needed.
     * @param {Object} config The elements configuration. Optional.
     * @namespace easyXDM.stack
     */
    StackElement: function(config){
        return {
            /**
             * This method will received incoming messages.<br/>
             * Use <code>this.up.incoming</code> to pass the message to the next element in the stack after processing.
             * @param {Object} message The incomming message
             * @param {String} origin The messages origin domain
             */
            incoming: function(message, origin){
            },
            /**
             * This method will receive outgoing messages<br/>
             * Use <code>this.down.outgoing</code> to pass the message to the next element in the stack after processing.
             * @param {Object} message The outgoing message
             * @param {String} domain The recipients domain
             * @param {Function} fn A callback to fire once the message has been successfully delivered. Optional.
             */
            outgoing: function(message, domain, fn){
            },
            /**
             * All destruction of the stack element should be placed here.<br/>
             * It is required that <code>this.down.destroy</code> is called after processing.
             */
            destroy: function(){
            },
            /**
             * All initalization of the stack element should be placed here.</br>
             * It is required that <code>this.down.init</code> is called after processing.
             */
            init: function(){
            },
            /**
             * This method will be fired once the underlying stack element has reached a state of readyness.
             * @param {Boolean} success If the stack is in a usable state.
             */
            callback: function(success){
            }
        };
    },
    
    /**
     * @class easyXDM.stack.TransportStackElement
     * The base interface that all transport stack elements should follow.<br/>
     * @extends easyXDM.stack.StackElement
     * @param {Object} config The configuration.
     * @cfg {String} channel The name of the channel to set up
     * @cfg {String} local The relative or absolute path to the local hash.html document.
     * @cfg {String} remote The absolute url to the document on the remote domain.
     */
    TransportStackElement: function(config){
    }
    
};
// #endif
