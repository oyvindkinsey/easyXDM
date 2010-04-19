/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM: true, window, escape, unescape, ActiveXObject */

// From http://peter.michaux.ca/articles/feature-detection-state-of-the-art-browser-scripting
function isHostMethod(object, property){
    var t = typeof object[property];
    return t == 'function' ||
    (!!(t == 'object' && object[property])) ||
    t == 'unknown';
}

function isHostObject(object, property){
    return !!(typeof(object[property]) == 'object' && object[property]);
}

function undef(v){
    return typeof v === "undefined";
}

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
     * Creates a cross-browser XMLHttpRequest object
     * @return {XMLHttpRequest} A XMLHttpRequest object.
     */
    createXmlHttpRequest: function(){
        if (undef(XMLHttpRequest)) {
            var item, list = ["Microsoft.XMLHTTP", "Msxml2.XMLHTTP", "Msxml3.XMLHTTP"], i = list.length;
            while (i--) {
                try {
                    item = list[i];
                    var obj = new ActiveXObject(item);
                    // we are still here!
                    obj = list = null;
                    break;
                } 
                catch (e) {
                }
            }
            this.createXmlHttpRequest = function(){
                return new ActiveXObject(item);
            };
        }
        else {
            this.createXmlHttpRequest = function(){
                return new XMLHttpRequest();
            };
        }
        return this.createXmlHttpRequest();
    },
    
    /**
     * Runs an asynchronous request using XMLHttpRequest
     * @param {String} method POST, HEAD or GET
     * @param {String} url The url to request
     * @param {Object} data Any data that should be sent.
     * @param {Function} success The callback function for successfull requests
     * @param {Function} error The callback function for errors
     */
    ajax: function(method, url, data, success, error){
        if (!error) {
            error = function(){
            };
        }
        var req = this.createXmlHttpRequest(), q = [];
        req.open(method, url, true);
        req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        req.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        req.onreadystatechange = function(){
            if (req.readyState == 4) {
                if (req.status >= 200 && req.status < 300) {
                    var contentType = req.getResponseHeader("Content-Type");
                    if (contentType.substring(0, 16) === "application/json") {
                        success(easyXDM.JSON.parse(req.responseText));
                    }
                    else {
                        error("Invalid content type: " + contentType);
                    }
                }
                else {
                    error("An error occured. Status code: " + req.status);
                }
                req.onreadystatechange = null;
                delete req.onreadystatechange;
            }
        };
        if (data) {
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    q.push(key + "=" + encodeURIComponent(data[key]));
                }
            }
        }
        req.send(q.join("&"));
    },
    
    /**
     * Prepares an array of stack-elements suitable for the current configuration
     * @param {Object} config The Transports configuration. See easyXDM.Socket for more.
     * @return {Array} An array of stack-elements with the TransportElement at index 0.
     */
    prepareTransportStack: function(config){
        var query = easyXDM.Url.Query(), u = easyXDM.Url, protocol = config.protocol, stackEls;
        config.isHost = config.isHost || undef(query.xdm_p);
        // #ifdef debug
        this._trace("preparing transport stack");
        // #endif
        if (!config.isHost) {
            // #ifdef debug
            this._trace("using parameters from query");
            // #endif
            config.channel = query.xdm_c;
            config.remote = decodeURIComponent(query.xdm_e);
            protocol = query.xdm_p;
        }
        else {
            config.remote = u.resolveUrl(config.remote);
            config.channel = config.channel || "default";
            if (undef(protocol)) {
                if (isHostMethod(window, "postMessage")) {
                    protocol = "1";
                }
                else if (config.remoteHelper) {
                    config.remoteHelper = u.resolveUrl(config.remoteHelper);
                    protocol = "2";
                }
                else {
                    protocol = "0";
                }
                // #ifdef debug
                this._trace("selecting protocol: " + protocol);
                // #endif
            }
            // #ifdef debug
            else {
                this._trace("using protocol: " + protocol);
            }
            // #endif
        }
        
        switch (protocol) {
            case "0":// 0 = HashTransport
                this.apply(config, {
                    interval: 300,
                    delay: 2000,
                    useResize: true,
                    useParent: false,
                    usePolling: false
                }, true);
                if (config.isHost) {
                    if (!config.local) {
                        // #ifdef debug
                        this._trace("looking for image to use as local");
                        // #endif
                        // If no local is set then we need to find an image hosted on the current domain
                        var domain = location.protocol + "//" + location.host, images = document.body.getElementsByTagName("img"), i = images.length, image;
                        while (i--) {
                            image = images[i];
                            if (image.src.substring(0, domain.length) === domain) {
                                config.local = image.src;
                                break;
                            }
                        }
                        if (!config.local) {
                            // #ifdef debug
                            this._trace("no image found, defaulting to using the window");
                            // #endif
                            // If no local was set, and we are unable to find a suitable file, then we resort to using the current window 
                            config.local = window;
                        }
                    }
                    
                    var parameters = {
                        xdm_c: config.channel,
                        xdm_p: 0
                    };
                    
                    if (config.local === window) {
                        // We are using the current window to listen to
                        config.usePolling = true;
                        config.useParent = true;
                        config.local = location.protocol + "//" + location.host + location.pathname + location.search;
                        parameters.xdm_e = encodeURIComponent(config.local);
                        parameters.xdm_pa = 1; // use parent
                    }
                    else {
                        parameters.xdm_e = u.resolveUrl(config.local);
                    }
                    
                    if (config.container) {
                        config.useResize = false;
                        parameters.xdm_po = 1; // use polling
                    }
                    config.remote = u.appendQueryParameters(config.remote, parameters);
                }
                else {
                    this.apply(config, {
                        channel: query.xdm_c,
                        remote: decodeURIComponent(query.xdm_e),
                        useParent: !undef(query.xdm_pa),
                        usePolling: !undef(query.xdm_po),
                        useResize: config.useParent ? false : config.useResize
                    });
                }
                stackEls = [new easyXDM.stack.HashTransport(config), new easyXDM.stack.ReliableBehavior({
                    timeout: ((config.useResize ? 50 : config.interval * 1.5) + (config.usePolling ? config.interval * 1.5 : 50))
                }), new easyXDM.stack.QueueBehavior({
                    encode: true,
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
    chainStack: function(stackElements){
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
    },
    
    /**
     * A safe implementation of HTML5 JSON. Feature testing is used to make sure the implementation works.
     * @type {JSON}
     */
    JSON: (function(){
        var obj = {
            a: [1, 2, 3]
        }, json = "{\"a\":[1,2,3]}", impl;
        
        if (JSON && typeof JSON.stringify === "function" && JSON.stringify(obj).replace((/\s/g), "") === json) {
            // this is a working JSON instance
            return JSON;
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
                return null;
            }
            return impl;
        }
    }())
};

/**
 * The namespace for all stack elements.
 * @private
 */
easyXDM.stack = {
    // #ifdef debug
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
    // #endif
};

