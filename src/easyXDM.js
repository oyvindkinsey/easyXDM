/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM: true, window, escape, unescape */

/** 
 * @class easyXDM
 * A javascript library providing cross-browser, cross-site messaging/method invocation.<br/>
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
     * Applies properties from the source object to the target object
     * @param {Object} target The target of the properties
     * @param {Object} source The source of the properties
     * @param {Boolean} onlyNew Set to True to only set non-existing properties
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
     * Method for applying behaviors to transports.<br/>
     * The transport must expose an <code>up</code> and <code>down</code> property
     * each implementing the behavior interface.
     * @param {Object} transport The transport to apply the behaviors to
     * @param {Array} behaviors An array of initialized behaviors to apply
     */
    applyBehaviors: function(transport, behaviors){
        var behavior;
        if (!behaviors || behaviors.length === 0) {
            transport.down.up = transport.down.down = transport.up;
            transport.up.up = transport.up.down = transport.down;
        }
        else if (behaviors.length === 1) {
            behavior = behaviors[0];
            behavior.down = behavior.up = transport.up;
            transport.down.down = transport.down.up = behavior;
            transport.up.down = transport.up.up = behavior;
            
        }
        else {
            for (var i = 0, len = behaviors.length; i < len; i++) {
                behavior = behaviors[i];
                if (i === 0) {
                    // this is the behavior closest to 'the metal'
                    transport.down.up = behavior; // override 
                    behavior.down = transport.up; // down to sendMessage
                    behavior.up = behaviors[i + 1];
                }
                else if (i === len - 1) {
                    // this is the behavior closes to the user
                    transport.down.down = behavior; //override
                    behavior.down = behaviors[i - 1];
                    behavior.up = transport.up;
                }
                else {
                    // intermediary behaviors
                    behavior.up = behaviors[i + 1];
                    behavior.down = behaviors[i - 1];
                }
            }
        }
    },
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
    createStack: function(behaviors){
        var behavior, stack, defaults = {
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
        for (var i = 0, len = behaviors.length; i < len; i++) {
            behavior = behaviors[i];
            this.apply(behavior, defaults, true);
            if (i !== 0) {
                behavior.down = behaviors[i - 1];
            }
            if (i !== len - 1) {
                behavior.up = behaviors[i + 1];
            }
        }
        return behavior;
    },
    
    /**
     * @class easyXDM.Fn
     * This contains methods related to function handling, such as storing callbacks.
     * @singleton
     * @namespace easyXDM
     */
    Fn: {
        /**
         * The map containing the stored functions
         * @namespace easyXDM.fn
         */
        map: {},
        /**
         * Stores a function using the given name for reference
         * @param {String} name The name that the function should be referred by
         * @param {Function} fn The function to store
         * @namespace easyXDM.fn
         */
        set: function(name, fn){
            // #ifdef debug
            easyXDM.Debug.trace("storing function " + name);
            // #endif
            this.map[name] = fn;
        },
        /**
         * Retrieves the function referred to by the given name
         * @param {String} name The name of the function to retrieve
         * @param {Boolean} del If the function should be deleted after retrieval
         * @return {Function} The stored function
         * @namespace easyXDM.fn
         */
        get: function(name, del){
            // #ifdef debug
            easyXDM.Debug.trace("retrieving function " + name);
            // #endif
            var fn = this.map[name];
            if (del) {
                delete this.map[name];
            }
            return fn;
        }
    },
    stack: {}
};
