/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, JSON, XMLHttpRequest, window, escape, unescape, ActiveXObject */

var global = this;
var _channelId = 0;
var emptyFn = Function.prototype;
var reURI = /^(http.?:\/\/([^\/\s]+))/, // returns groups for origin (1) and domain (2)
 reParent = /[\-\w]+\/\.\.\//, // matches a foo/../ expression 
 reDoubleSlash = /([^:])\/\//g; // matches // anywhere but in the protocol
//Sniffing is bad, but in this case unavoidable
var CREATE_FRAME_USING_HTML = /msie [67]/.test(navigator.userAgent.toLowerCase());
// #ifdef debug
var _trace = emptyFn;
// #endif


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
 * Cross Browser implementation of DOMContentLoaded.
 */
var isReady = false, domReadyQueue = [];
if ("readyState" in document) {
    isReady = document.readyState == "complete";
}
else {
    // If readyState is not supported in the browser, then in order to be able to fire whenReady functions apropriately
    // when added dynamically _after_ DOM load, we have to deduce wether the DOM is ready or not.
    if (document.body) {
        // document.body is not available prior to the body being built
        // This does mean that we might fire it prematurely, but we only need the body element to be available for appending.
        isReady = true;
    }
}

function dom_onLoaded(){
    if (isReady) {
        return;
    }
    // #ifdef debug
    _trace("firing dom_onLoaded");
    // #endif
    isReady = true;
    for (var i = 0; i < domReadyQueue.length; i++) {
        domReadyQueue[i]();
    }
    domReadyQueue.length = 0;
    un(window, "DOMContentLoaded", dom_onLoaded);
    un(document, "DOMContentLoaded", dom_onLoaded);
    if (isHostMethod(window, "ActiveXObject")) {
        un(window, "load", dom_onLoaded);
    }
}

function document_onReadyStateChange(){
    if (document.readyState == "complete") {
        dom_onLoaded();
        un(document, "readystatechange", document_onReadyStateChange);
    }
}

if (!isReady) {
    on(window, "DOMContentLoaded", dom_onLoaded);
    on(document, "DOMContentLoaded", dom_onLoaded);
    
    if (isHostMethod(window, "ActiveXObject")) {
        on(document, "readystatechange", document_onReadyStateChange);
        on(window, "load", dom_onLoaded);
        
        if (window === top) {
            (function doScrollCheck(){
                if (isReady) {
                    return;
                }
                // http://javascript.nwbox.com/IEContentLoaded/
                try {
                    document.documentElement.doScroll("left");
                } 
                catch (e) {
                    setTimeout(doScrollCheck, 1);
                    return;
                }
                dom_onLoaded();
            }());
        }
    }
}
/**
 * This will add a function to the queue of functions to be run once the DOM reaches a ready state.
 * If functions are added after this event then they will be executed immediately.
 * @param {function} fn The function to add
 * @param {Object} scope An optional scope for the function to be called with.
 */
function whenReady(fn, scope){
    if (isReady) {
        fn.call(scope);
        return;
    }
    domReadyQueue.push(function(){
        fn.call(scope);
    });
}

/*
 * Methods for working with URLs
 */
/**
 * Get the domain name from a url.
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
    
    var hash = "", indexOf = url.indexOf("#");
    if (indexOf !== -1) {
        hash = url.substring(indexOf);
        url = url.substring(0, indexOf);
    }
    var q = [];
    for (var key in parameters) {
        if (parameters.hasOwnProperty(key)) {
            q.push(key + "=" + encodeURIComponent(parameters[key]));
        }
    }
    return url + ((url.indexOf("?") === -1) ? "?" : "&") + q.join("&") + hash;
}

var query = (function(){
    var query = {}, pair, search = location.search.substring(1).split("&"), i = search.length;
    while (i--) {
        pair = search[i].split("=");
        query[pair[0]] = decodeURIComponent(pair[1]);
    }
    return query;
}());

/*
 * Helper methods
 */
/**
 * Helper for checking if a variable/property is undefined
 * @param {Object} v The variable to test
 * @return {Boolean} True if the passed variable is undefined
 */
function undef(v){
    return typeof v === "undefined";
}

/**
 * A safe implementation of HTML5 JSON. Feature testing is used to make sure the implementation works.
 * @return {JSON} A valid JSON conforming object, or null if not found.
 */
function getJSON(){
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
        getJSON = function(){
            return cached;
        };
        return cached;
    }
    return null;
}

/**
 * Applies properties from the source object to the target object.<br/>
 * @param {Object} target The target of the properties.
 * @param {Object} source The source of the properties.
 * @param {Boolean} noOverwrite Set to True to only set non-existing properties.
 */
function apply(destination, source, noOverwrite){
    var member;
    for (var prop in source) {
        if (source.hasOwnProperty(prop)) {
            if (prop in destination) {
                member = source[prop];
                if (typeof member === "object") {
                    apply(destination[prop], member, noOverwrite);
                }
                else if (!noOverwrite) {
                    destination[prop] = source[prop];
                }
            }
            else {
                destination[prop] = source[prop];
            }
        }
    }
    return destination;
}

/**
 * Creates a frame and appends it to the DOM.
 * @param config {object} This object can have the following properties
 * <ul>
 * <li> {object} prop The properties that should be set on the frame. This should include the 'src' property.</li>
 * <li> {object} attr The attributes that should be set on the frame.</li>
 * <li> {DOMElement} container Its parent element (Optional).</li>
 * <li> {function} onLoad A method that should be called with the frames contentWindow as argument when the frame is fully loaded. (Optional)</li>
 * </ul>
 * @return The frames DOMElement
 * @type DOMElement
 */
function createFrame(config){
    // #ifdef debug
    _trace("creating frame: " + config.props.src);
    // #endif
    var frame;
    // This is to work around the problems in IE6/7 with setting the name property. 
    // Internally this is set as 'submitName' instead when using 'iframe.name = ...'
    // This is not required by easyXDM itself, but is to facilitate other use cases 
    if (config.props.name && CREATE_FRAME_USING_HTML) {
        frame = document.createElement("<iframe name=\"" + config.props.name + "\"/>");
    }
    else {
        frame = document.createElement("IFRAME");
    }
    
    if (config.props.name) {
        // We need to add these properties before adding the element to te DOM
        frame.id = frame.name = config.props.name;
        delete config.props.name;
    }
    
    if (config.onLoad) {
        frame.loadFn = function(){
            config.onLoad(frame.contentWindow);
        };
        on(frame, "load", frame.loadFn);
    }
    
    if (typeof config.container == "string") {
        config.container = document.getElementById(config.container);
    }
    
    if (!config.container) {
        // This needs to be hidden like this, simply setting display:none and the like will cause failures in some browsers.
        frame.style.position = "absolute";
        frame.style.left = "-2000px";
        frame.style.top = "0px";
        config.container = document.body;
    }
    
    frame.border = frame.frameBorder = 0;
    config.container.insertBefore(frame, config.container.firstChild);
    
    // transfer properties to the frame
    apply(frame, config.props);
    return frame;
}

/*
 * Methods related to AJAX
 */
/**
 * Creates a cross-browser XMLHttpRequest object
 * @return {XMLHttpRequest} A XMLHttpRequest object.
 */
var getXhr = (function(){
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

/** 
 * Runs an asynchronous request using XMLHttpRequest
 * @param {object} config The configuration
 */
function ajax(config){
    var req = getXhr(), pairs = [], data, isPOST;
    
    apply(config, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest"
        },
        success: emptyFn,
        error: function(msg){
            throw new Error(msg);
        },
        data: {},
        type: "plain"
    }, true);
    isPOST = config.method == "POST";
    
    for (var key in config.data) {
        if (config.data.hasOwnProperty(key)) {
            pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(config.data[key]));
        }
    }
    data = pairs.join("&");
    
    req.open(config.method, config.url + (isPOST ? "" : "?" + data), true);
    
    for (var prop in config.headers) {
        if (config.headers.hasOwnProperty(prop)) {
            req.setRequestHeader(prop, config.headers[prop]);
        }
    }
    
    req.onreadystatechange = function(){
        if (req.readyState == 4) {
            if (req.status >= 200 && req.status < 300) {
                if (config.type == "json") {
                    try {
                        config.success(getJSON().parse(req.responseText));
                    } 
                    catch (e) {
                        config.error("An error occured. Error parsing JSON: " + e.message);
                    }
                }
                else {
                    config.success(req.responseText);
                }
            }
            else {
                config.error("An error occured. Status code: " + req.status);
            }
            req.onreadystatechange = emptyFn;
        }
    };
    
    req.send(isPOST ? data : "");
}

/**
 * Check whether a domain is allowed using an Access Control List.
 * The ACL can contain * and ? as wildcards, or can be regular expressions.
 * If regular expressions they need to begin with ^ and end with $.
 * @param {Array/String} acl The list of allowed domains
 * @param {String} domain The domain to test.
 * @return {Boolean} True if the domain is allowed, false if not.
 */
function checkAcl(acl, domain){
    // normalize into an array
    if (typeof acl == "string") {
        acl = [acl];
    }
    var re, i = acl.length;
    while (i--) {
        re = acl[i];
        re = new RegExp(re.substr(0, 1) == "^" ? re : ("^" + re.replace(/(\*)/g, ".$1").replace(/\?/g, ".") + "$"));
        if (re.test(domain)) {
            return true;
        }
    }
    return false;
}

/*
 * Functions related to stacks
 */
/**
 * Prepares an array of stack-elements suitable for the current configuration
 * @param {Object} config The Transports configuration. See easyXDM.Socket for more.
 * @return {Array} An array of stack-elements with the TransportElement at index 0.
 */
function prepareTransportStack(config){
    var protocol = config.protocol, stackEls;
    config.isHost = config.isHost || undef(query.xdm_p);
    // #ifdef debug
    _trace("preparing transport stack");
    // #endif
    
    if (!config.props) {
        config.props = {};
    }
    if (!config.isHost) {
        // #ifdef debug
        _trace("using parameters from query");
        // #endif
        config.channel = query.xdm_c;
        config.secret = query.xdm_s;
        config.remote = query.xdm_e;
        protocol = query.xdm_p;
        if (config.acl && !checkAcl(config.acl, config.remote)) {
            throw new Error("Access denied for " + config.remote);
        }
    }
    else {
        config.remote = resolveUrl(config.remote);
        config.channel = config.channel || "default" + _channelId++;
        config.secret = Math.random().toString(16).substring(2);
        if (undef(protocol)) {
            if (getLocation(location.href) == getLocation(config.remote)) {
                /*
                 * Both documents has the same origin, lets use direct access.
                 */
                protocol = "4";
            }
            else if (isHostMethod(window, "postMessage") || isHostMethod(document, "postMessage")) {
                /*
                 * This is supported in IE8+, Firefox 3+, Opera 9+, Chrome 2+ and Safari 4+
                 */
                protocol = "1";
            }
            else if (isHostMethod(window, "ActiveXObject") && isHostMethod(window, "execScript")) {
                /*
                 * This is supported in IE6 and IE7
                 */
                protocol = "3";
            }
            else if (navigator.product === "Gecko" && "frameElement" in window && navigator.userAgent.indexOf('WebKit') == -1) {
                /*
                 * This is supported in Gecko (Firefox 1+)
                 */
                protocol = "5";
            }
            else if (config.remoteHelper) {
                /*
                 * This is supported in all browsers that retains the value of window.name when
                 * navigating from one domain to another, and where parent.frames[foo] can be used
                 * to get access to a frame from the same domain
                 */
                config.remoteHelper = resolveUrl(config.remoteHelper);
                protocol = "2";
            }
            else {
                /*
                 * This is supported in all browsers where [window].location is writable for all
                 * The resize event will be used if resize is supported and the iframe is not put
                 * into a container, else polling will be used.
                 */
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
                interval: 100,
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
                    var domain = location.protocol + "//" + location.host, images = document.body.getElementsByTagName("img"), image;
                    var i = images.length;
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
                    parameters.xdm_e = config.local;
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
                    channel: query.xdm_c,
                    remote: query.xdm_e,
                    useParent: !undef(query.xdm_pa),
                    usePolling: !undef(query.xdm_po),
                    useResize: config.useParent ? false : config.useResize
                });
            }
            stackEls = [new easyXDM.stack.HashTransport(config), new easyXDM.stack.ReliableBehavior({
                timeout: config.interval * 1.5
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
        case "4":
            stackEls = [new easyXDM.stack.SameOriginTransport(config)];
            break;
        case "5":
            stackEls = [new easyXDM.stack.FrameElementTransport(config)];
            break;
    }
    // this behavior is responsible for buffering outgoing messages, and for performing lazy initialization
    stackEls.push(new easyXDM.stack.QueueBehavior({
        lazy: config.lazy
    }));
    return stackEls;
}

/**
 * Chains all the separate stack elements into a single usable stack.<br/>
 * If an element is missing a necessary method then it will have a pass-through method applied.
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
global.easyXDM = {
    /**
     * The version of the library
     * @type {string}
     */
    version: "%%version%%",
    /**
     * This is a map containing all the query parameters passed to the document.
     * All the values has been decoded using decodeURIComponent.
     * @type {object}
     */
    query: query,
    /**
     * @private
     */
    stack: {},
    /**
     * Applies properties from the source object to the target object.<br/>
     * @param {object} target The target of the properties.
     * @param {object} source The source of the properties.
     * @param {boolean} noOverwrite Set to True to only set non-existing properties.
     */
    apply: apply,
    /** 
     * Runs an asynchronous request using XMLHttpRequest
     * @param {object} config This object can have the following properties
     * <ul>
     * <li> url: string<br/>The url to request.</li>
     * <li> method: string<br/>POST, HEAD or GET.</li>
     * <li> data: object<br/>Any data that should be sent.</li>
     * <li> type: string<br/>The type of data to retrieve. If set to 'json' then the result will be parsed.</li>
     * <li> success: function<br/>The callback function for successfull requests.</li>
     * <li> error: function<br/>The callback function for errors.</li>
     * </ul>
     */
    ajax: ajax,
    /**
     * A safe implementation of HTML5 JSON. Feature testing is used to make sure the implementation works.
     * @return {JSON} A valid JSON conforming object, or null if not found.
     */
    getJSONObject: getJSON,
    /**
     * This will add a function to the queue of functions to be run once the DOM reaches a ready state.
     * If functions are added after this event then they will be executed immediately.
     * @param {function} fn The function to add
     * @param {object} scope An optional scope for the function to be called with.
     */
    whenReady: whenReady
};
