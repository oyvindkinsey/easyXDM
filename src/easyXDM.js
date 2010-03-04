/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM: true, window, escape, unescape, _FirebugCommandLine */

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
    getTransportBehaviors: function(config){
        var query = easyXDM.Url.Query(), isHost = (typeof query.xdm_p === "undefined"), Transport, protocol = config.protocol;
        // If no protocol is set then it means this is the host
        if (typeof query.xdm_p !== "undefined") {
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
        }
        
        config.channel = config.channel || "default";
        
        switch (protocol) {
            case "0":
                config.interval = config.interval || 300;
                config.useResize = true;
                config.useParent = false;
                config.usePolling = false;
                if (isHost) {
                    var parameters = {
                        xdm_c: config.channel,
                        xdm_p: 0 // 0 = HashTransport
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
                return [new easyXDM.behaviors.transports.HashTransportBehavior(config), new easyXDM.transport.behaviors.ReliableBehavior({
                    timeout: ((config.useResize ? 50 : config.interval * 1.5) + (config.usePolling ? config.interval * 1.5 : 50))
                }), new easyXDM.transport.behaviors.QueueBehavior({
                    maxLength: 4000 - config.remote.length
                }), new easyXDM.transport.behaviors.VerifyBehavior({
                    initiate: isHost
                })];
                
                break;
            case "1":
                return [new easyXDM.behaviors.transports.PostMessageBehavior(config)];
                break;
            case "2":
                break;
        }
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
        }
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
    // #ifdef debug
    /**
     * @class easyXDM.Debug
     * Utilities for debugging. This class is only precent in the debug version.
     * @singleton
     * @namespace easyXDM
     */
    Debug: {
        /**
         * Logs the message to console.log if available
         * @param {String} msg The message to log
         */
        log: function(msg){
            // Uses memoizing to cache the implementation
            var log;
            if (typeof console === "undefined" || typeof console.log === "undefined") {
                /**
                 * Sets log to be an empty function since we have no output available
                 * @ignore
                 */
                log = function(){
                };
            }
            else {
                /**
                 * Sets log to be a wrapper around console.log
                 * @ignore
                 * @param {String} msg
                 */
                log = function(msg){
                    console.log(location.host + "-" + new Date().valueOf() + ":" + msg);
                };
            }
            log(msg);
            easyXDM.Debug.log = log;
        },
        
        
        clear: function(){
            var clear;
            var el = document.getElementById("log");
            if (el) {
                /**
                 * Sets trace to be a function that outputs the messages to the DOMElement with id "log"
                 * @ignore
                 * @param {String} msg
                 */
                clear = function(){
                    try {
                        el.innerHTML = "";
                    } 
                    catch (e) {
                        //In case we are unloading
                    }
                };
            }
            else if (typeof console === "undefined" || typeof console.info === "undefined") {
                /**
                 * Create log window
                 * @ignore
                 */
                var domain = location.host;
                var windowname = domain.replace(/\./g, "") + "easyxdm_log";
                var logWin = window.open("", windowname, "width=800,height=200,status=0,navigation=0,scrollbars=1");
                if (logWin) {
                    el = logWin.document.getElementById("log");
                    clear = function(){
                        try {
                            el.innerHTML = "";
                        } 
                        catch (e) {
                            //In case we are unloading
                        }
                    };
                }
                else {
                    clear = function(){
                    };
                }
            }
            else if (console.clear) {
                clear = function(){
                    console.clear();
                };
            }
            else if (_FirebugCommandLine.clear) {
                clear = function(){
                    _FirebugCommandLine.clear();
                };
            }
            easyXDM.Debug.clear = clear;
        },
        
        /**
         * Will try to trace the given message either to a DOMElement with the id "log",
         * or by using console.info.
         * @param {String} msg The message to trace
         */
        trace: function(msg){
            // Uses memoizing to cache the implementation
            var trace;
            var el = document.getElementById("log");
            if (el) {
                /**
                 * Sets trace to be a function that outputs the messages to the DOMElement with id "log"
                 * @ignore
                 * @param {String} msg
                 */
                trace = function(msg){
                    try {
                        el.appendChild(document.createElement("div")).appendChild(document.createTextNode(location.host + "-" + new Date().valueOf() + ":" + msg));
                        el.scrollTop = el.scrollHeight;
                    } 
                    catch (e) {
                        //In case we are unloading
                    }
                };
            }
            else if (typeof console === "undefined" || typeof console.info === "undefined") {
                /**
                 * Create log window
                 * @ignore
                 */
                var domain = location.host;
                var windowname = domain.replace(/\./g, "") + "easyxdm_log";
                var logWin = window.open("", windowname, "width=800,height=200,status=0,navigation=0,scrollbars=1");
                if (logWin) {
                    var doc = logWin.document;
                    if (doc.title !== "easyXDM log") {
                        doc.write("<html><head><title>easyXDM log " + domain + "</title></head>");
                        doc.write("<body><div id=\"log\"></div></body></html>");
                        doc.close();
                    }
                    el = doc.getElementById("log");
                    trace = function(msg){
                        try {
                            el.appendChild(doc.createElement("div")).appendChild(doc.createTextNode(location.host + "-" + new Date().valueOf() + ":" + msg));
                            el.scrollTop = el.scrollHeight;
                        } 
                        catch (e) {
                            //In case we are unloading
                        }
                    };
                    trace("---- new logger at " + location.href);
                }
            }
            else {
                /**
                 * Sets trace to be a wrapper around console.info
                 * @ignore
                 * @param {String} msg
                 */
                trace = function(msg){
                    console.info(location.host + "-" + new Date().valueOf() + ":" + msg);
                };
            }
            easyXDM.Debug.trace = trace;
            easyXDM.Debug.trace(msg);
        }
    },
    // #endif
    
    /** 
     * @class easyXDM.Interface
     * Creates an interface that can be used to call methods implemented
     * on the remote end of the channel, and also to provide the implementation
     * of methods to be called from the remote end.
     * @constructor
     * @param {easyXDM.configuration.ChannelConfiguration} channelConfig The underlying channels configuration.
     * @param {easyXDM.configuration.InterfaceConfiguration} config The description of the interface to implement
     * @param {Function} onReady A method that should be called when the interface is ready
     * @namespace easyXDM
     */
    Interface: function(channelConfig, config, onReady){
        var stack, query = easyXDM.Url.Query(), isHost = (typeof query.xdm_p === "undefined"), recipient;
        if (!isHost) {
            channelConfig.channel = query.xdm_c;
            channelConfig.remote = decodeURIComponent(query.xdm_e);
        }
        // #ifdef debug
        easyXDM.Debug.trace("creating new interface");
        // #endif
        
        this.destroy = function(){
            stack.destroy();
        }
        
        stack = easyXDM.createStack([new easyXDM.behaviors.transports.PostMessageBehavior({
            isHost: isHost,
            channel: channelConfig.channel,
            remote: channelConfig.remote
        }), new easyXDM.behaviors.RPCBehavior(this, config), {
            incoming: function(message, origin){
                config.onMessage(message, origin);
            },
            callback: function(success){
                if (onReady) {
                    onReady(success);
                }
            }
        }]);
        stack.init();
    },
    /**
     * @class easyXDM.Channel
     * A channel wrapping an underlying transport.
     * @constructor
     * @param {easyXDM.ChannelConfiguration} config The channels configuration
     * @cfg {JSON} serializer The object used to serializer/deserialize the data
     * @cfg {Function} onData The method that should handle incoming data.<br/> This method should accept two arguments, the data as an object, and the origin as a string.
     * @param {Function} onReady A method that should be called when the channel is ready
     * @namespace easyXDM
     */
    Channel: function(config, onReady){
        // #ifdef debug
        easyXDM.Debug.trace("easyXDM.Channel.constructor");
        // #endif
        // For compatibility
        config.serializer = config.serializer || config.converter;
        if (!config.serializer) {
            throw new Error("No serializer present. You should use the easyXDM.transport classes directly.");
        }
        /**
         * Wraps the transports onMessage method using the supplied serializer to convert.
         * @param {Object} data
         * @private
         */
        config.onMessage = function(message, origin){
            this.onData(this.serializer.parse(message), origin);
        };
        
        /**
         * The underlying transport used by this channel
         * @type easyXDM.transport.ITransport
         */
        this.transport = null;
        /**
         * Tries to destroy the underlying transport
         */
        this.destroy = function(){
            // #ifdef debug
            easyXDM.Debug.trace("easyXDM.Channel.destroy");
            // #endif
            this.transport.destroy();
        };
        /**
         * Send data using the underlying transport
         * If a serializer is specified then this will be used to serialize the data first.
         * @param {Object} data the data to send
         */
        this.sendData = function(data){
            this.transport.postMessage(config.serializer.stringify(data));
        };
        
        var that = this;
        
        // Delay setting up the transport until the Channel is returned
        window.setTimeout(function(){
            that.transport = new easyXDM.transport.BestAvailableTransport(config, onReady);
        }, 5);
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
    }
};

// #ifdef debug
easyXDM.Debug.log("easyXDM present on '" + location.href);
// #endif
