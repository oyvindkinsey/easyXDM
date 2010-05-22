/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM: true, window, escape, unescape, ActiveXObject */

// #ifdef debug
var _trace;
// #endif

var _channelId = 0;

var reURI = /^(http.?:\/\/([^\/\s]+))/, // returns groups for origin (1) and domain (2)
 reParent = /[\-\w]+\/\.\.\//, // matches a foo/../ expression 
 reDoubleSlash = /([^:])\/\//g; // matches // anywhere but in the protocol
/* Methods for feature testing
 * From http://peter.michaux.ca/articles/feature-detection-state-of-the-art-browser-scripting
 */
function isHostMethod(object, property){
    var t = typeof object[property];
    return t == 'function' ||
    (!!(t == 'object' && object[property])) ||
    t == 'unknown';
}

function isHostObject(object, property){
    return !!(typeof(object[property]) == 'object' && object[property]);
}

/*
 * Create normalized methods for adding and removing events
 */
var on = (function(){
    if (isHostMethod(window, "addEventListener")) {
        /**
         * Set on to use the DOM level 2 addEventListener
         * https://developer.mozilla.org/en/DOM/element.on
         * @ignore
         * @param {Object} target
         * @param {String} type
         * @param {Function} listener
         */
        return function(target, type, listener){
            // #ifdef debug
            _trace("adding listener " + type);
            // #endif
            target.addEventListener(type, listener, false);
        };
    }
    else {
        /**
         * Set on to a wrapper around the IE spesific attachEvent
         * http://msdn.microsoft.com/en-us/library/ms536343%28VS.85%29.aspx
         * @ignore
         * @param {Object} object
         * @param {String} sEvent
         * @param {Function} fpNotify
         */
        return function(object, sEvent, fpNotify){
            // #ifdef debug
            _trace("adding listener " + sEvent);
            // #endif
            object.attachEvent("on" + sEvent, fpNotify);
        };
    }
}());

var un = (function(){
    if (isHostMethod(window, "removeEventListener")) {
        /**
         * Set un to use the DOM level 2 removeEventListener
         * https://developer.mozilla.org/en/DOM/element.un
         * @ignore
         * @param {Object} target
         * @param {String} type
         * @param {Function} listener
         */
        return function(target, type, listener, useCapture){
            // #ifdef debug
            _trace("removing listener " + type);
            // #endif
            target.removeEventListener(type, listener, useCapture);
        };
    }
    else {
        /**
         * Set un to a wrapper around the IE spesific detachEvent
         * http://msdn.microsoft.com/en-us/library/ms536411%28VS.85%29.aspx
         * @ignore
         * @param {Object} object
         * @param {String} sEvent
         * @param {Function} fpNotify
         */
        return function(object, sEvent, fpNotify){
            // #ifdef debug
            _trace("removing listener " + sEvent);
            // #endif
            object.detachEvent("on" + sEvent, fpNotify);
        };
    }
}());

/*
 * Methods for working with URLs
 */
/**
 * Get the domain name from a url.
 * @private
 * @param {String} url The url to extract the domain from.
 * @returns The domain part of the url.
 * @type {String}
 */
function getDomainName(url){
    // #ifdef debug
    if (!url) {
        throw new Error("url is undefined or empty");
    }
    // #endif
    return url.match(reURI)[2];
}

/**
 * Returns  a string containing the schema, domain and if present the port
 * @private
 * @param {String} url The url to extract the location from
 * @return {String} The location part of the url
 */
function getLocation(url){
    // #ifdef debug
    if (!url) {
        throw new Error("url is undefined or empty");
    }
    // #endif
    return url.match(reURI)[1];
}

/**
 * Resolves a relative url into an absolute one.
 * @private
 * @param {String} url The path to resolve.
 * @return {String} The resolved url.
 */
function resolveUrl(url){
    // #ifdef debug
    if (!url) {
        throw new Error("url is undefined or empty");
    }
    // #endif
    
    // replace all // except the one in proto with /
    url = url.replace(reDoubleSlash, "$1/");
    
    // If the url is a valid url we do nothing
    if (!url.match(/^(http||https):\/\//)) {
        // If this is a relative path
        var path = (url.substring(0, 1) === "/") ? "" : location.pathname;
        if (path.substring(path.length - 1) !== "/") {
            path = path.substring(0, path.lastIndexOf("/") + 1);
        }
        
        url = location.protocol + "//" + location.host + path + url;
    }
    
    // reduce all 'xyz/../' to just '' 
    while (reParent.test(url)) {
        url = url.replace(reParent, "");
    }
    
    // #ifdef debug
    _trace("resolved url '" + url + "'");
    // #endif
    return url;
}

/**
 * Appends the parameters to the given url.<br/>
 * The base url can contain existing query parameters.
 * @private
 * @param {String} url The base url.
 * @param {Object} parameters The parameters to add.
 * @return {String} A new valid url with the parameters appended.
 */
function appendQueryParameters(url, parameters){
    // #ifdef debug
    if (!parameters) {
        throw new Error("parameters is undefined or null");
    }
    // #endif
    var q = [];
    for (var key in parameters) {
        if (parameters.hasOwnProperty(key)) {
            q.push(key + "=" + parameters[key]);
        }
    }
    return url + ((url.indexOf("?") === -1) ? "?" : "&") + q.join("&");
}

var Query = (function(){
    var query = {}, pair, search = location.search.substring(1).split("&"), i = search.length;
    while (i--) {
        pair = search[i].split("=");
        query[pair[0]] = pair[1];
    }
    return query;
}());

/*
 * Helper methods
 */
/**
 * Helper for checking if a variable/property is undefined
 * @private
 * @param {Object} v The variable to test
 * @return {Boolean} True if the passed variable is undefined
 */
function undef(v){
    return typeof v === "undefined";
}

/**
 * A safe implementation of HTML5 JSON. Feature testing is used to make sure the implementation works.
 * @private
 * @return {JSON} A valid JSON conforming object, or null if not found.
 */
function getJSONObject(){
    var cached = {};
    var obj = {
        a: [1, 2, 3]
    }, json = "{\"a\":[1,2,3]}";
    
    if (JSON && typeof JSON.stringify === "function" && JSON.stringify(obj).replace((/\s/g), "") === json) {
        // this is a working JSON instance
        return JSON;
    }
    if (Object.toJSON) {
        if (Object.toJSON(obj).replace((/\s/g), "") === json) {
            // this is a working stringify method
            cached.stringify = Object.toJSON;
        }
    }
    
    if (typeof String.prototype.evalJSON === "function") {
        obj = json.evalJSON();
        if (obj.a && obj.a.length === 3 && obj.a[2] === 3) {
            // this is a working parse method           
            cached.parse = function(str){
                return str.evalJSON();
            };
        }
    }
    
    if (cached.stringify && cached.parse) {
        // Only memoize the result if we have valid instance
        getJSONObject = function(){
            return cached;
        };
        return cached;
    }
    return null;
}

/**
 * Applies properties from the source object to the target object.<br/>
 * This is a destructive method.
 * @private
 * @param {Object} target The target of the properties.
 * @param {Object} source The source of the properties.
 * @param {Boolean} onlyNew Set to True to only set non-existing properties.
 */
function apply(target, source, onlyNew){
    if (!source) {
        return;
    }
    for (var key in source) {
        if (source.hasOwnProperty(key) && (!onlyNew || !target[key])) {
            target[key] = source[key];
        }
    }
}

/**
 * Creates a frame and appends it to the DOM.
 * @private
 * @param {String} url The url the frame should be set to
 * @param {DOMElement} container Its parent element (Optional)
 * @param {Function} onLoad A method that should be called with the frames contentWindow as argument when the frame is fully loaded. (Optional)
 * @param {String} name The id/name the frame should get (Optional)
 * @return The frames DOMElement
 * @type DOMElement
 */
function createFrame(url, container, onLoad, name){
    // #ifdef debug
    _trace("creating frame: " + url);
    // #endif
    var frame = document.createElement("IFRAME");
    frame.src = url;
    if (name) {
        //id needs to be set for the references to work reliably
        frame.id = frame.name = name;
    }
    if (onLoad) {
        frame.loadFn = function(){
            onLoad(frame.contentWindow);
        };
        on(frame, "load", frame.loadFn);
    }
    if (container) {
        // Remove the frame
        frame.border = frame.frameBorder = 0;
        container.appendChild(frame);
    }
    else {
        // This needs to be hidden like this, simply setting display:none and the like will cause failures in some browsers.
        frame.style.position = "absolute";
        frame.style.left = "-2000px";
        frame.style.top = "0px";
        document.body.appendChild(frame);
    }
    return frame;
}

/*
 * Methods related to AJAX
 */
/**
 * Creates a cross-browser XMLHttpRequest object
 * @private
 * @return {XMLHttpRequest} A XMLHttpRequest object.
 */
var createXmlHttpRequest = (function(){
    if (isHostMethod(window, "XMLHttpRequest")) {
        return function(){
            return new XMLHttpRequest();
        };
    }
    else {
        var item = (function(){
            var list = ["Microsoft", "Msxml2", "Msxml3"], i = list.length;
            while (i--) {
                try {
                    item = list[i] + ".XMLHTTP";
                    var obj = new ActiveXObject(item);
                    return item;
                } 
                catch (e) {
                }
            }
        }());
        return function(){
            return new ActiveXObject(item);
        };
    }
}());

/** Runs an asynchronous request using XMLHttpRequest
 * @private
 * @param {String} method POST, HEAD or GET
 * @param {String} url The url to request
 * @param {Object} data Any data that should be sent.
 * @param {Function} success The callback function for successfull requests
 * @param {Function} error The callback function for errors
 */
function ajax(method, url, data, success, error){
    if (!error) {
        error = function(){
        };
    }
    var req = createXmlHttpRequest(), q = [];
    req.open(method, url, true);
    req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    req.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    req.onreadystatechange = function(){
        if (req.readyState == 4) {
            if (req.status >= 200 && req.status < 300) {
                var contentType = req.getResponseHeader("Content-Type");
                if (contentType.substring(0, 16) === "application/json") {
                    success(getJSONObject().parse(req.responseText));
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
}

/*
 * Functions related to stacks
 */
/**
 * Prepares an array of stack-elements suitable for the current configuration
 * @private
 * @param {Object} config The Transports configuration. See easyXDM.Socket for more.
 * @return {Array} An array of stack-elements with the TransportElement at index 0.
 */
function prepareTransportStack(config){
    var protocol = config.protocol, stackEls;
    config.isHost = config.isHost || undef(Query.xdm_p);
    // #ifdef debug
    _trace("preparing transport stack");
    // #endif
    if (!config.isHost) {
        // #ifdef debug
        _trace("using parameters from query");
        // #endif
        config.channel = Query.xdm_c;
        config.secret = Query.xdm_s;
        config.remote = decodeURIComponent(Query.xdm_e);
        protocol = Query.xdm_p;
    }
    else {
        config.remote = resolveUrl(config.remote);
        config.channel = config.channel || "default" + _channelId++;
        config.secret = Math.random().toString(16).substring(2);
        if (undef(protocol)) {
            if (isHostMethod(window, "postMessage")) {
                protocol = "1";
            }
            else if (isHostMethod(window, "ActiveXObject") && isHostMethod(window, "execScript")) {
                protocol = "3";
            }
            else if (config.remoteHelper) {
                config.remoteHelper = resolveUrl(config.remoteHelper);
                protocol = "2";
            }
            else {
                protocol = "0";
            }
            // #ifdef debug
            _trace("selecting protocol: " + protocol);
            // #endif
        }
        // #ifdef debug
        else {
            _trace("using protocol: " + protocol);
        }
        // #endif
    }
    
    switch (protocol) {
        case "0":// 0 = HashTransport
            apply(config, {
                interval: 300,
                delay: 2000,
                useResize: true,
                useParent: false,
                usePolling: false
            }, true);
            if (config.isHost) {
                if (!config.local) {
                    // #ifdef debug
                    _trace("looking for image to use as local");
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
                        _trace("no image found, defaulting to using the window");
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
                    parameters.xdm_e = resolveUrl(config.local);
                }
                
                if (config.container) {
                    config.useResize = false;
                    parameters.xdm_po = 1; // use polling
                }
                config.remote = appendQueryParameters(config.remote, parameters);
            }
            else {
                apply(config, {
                    channel: Query.xdm_c,
                    remote: decodeURIComponent(Query.xdm_e),
                    useParent: !undef(Query.xdm_pa),
                    usePolling: !undef(Query.xdm_po),
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
        case "3":
            stackEls = [new easyXDM.stack.NixTransport(config)];
            break;
    }
    
    return stackEls;
}

/**
 * Chains all the separate stack elements into a single usable stack.<br/>
 * If an element is missing a necessary method then it will have a pass-through method applied.
 * @private
 * @param {Array} stackElements An array of stack elements to be linked.
 * @return {easyXDM.stack.StackElement} The last element in the chain.
 */
function chainStack(stackElements){
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
        apply(stackEl, defaults, true);
        if (i !== 0) {
            stackEl.down = stackElements[i - 1];
        }
        if (i !== len - 1) {
            stackEl.up = stackElements[i + 1];
        }
    }
    return stackEl;
}

/*
 * Export the main object and any other methods applicable
 */
/** 
 * @class easyXDM
 * A javascript library providing cross-browser, cross-domain messaging/RPC.
 * @version %%version%%
 * @singleton
 */
easyXDM = {
    /**
     * The version of the library
     * @type {String}
     */
    version: "%%version%%",
    apply: apply,
    ajax: ajax,
    getJSONObject: getJSONObject,
    stack: {}
};
