/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/** 
 * @class easyXDM.Url
 * Contains methods for dealing with url's
 * @singleton
 */
easyXDM.Url = {

    /**
     * A hashtable that gives access to the documents query string.<br/>
     * The hashtable is cached internally.
     * @returns A hashtable populated with keys and values from the querystring.
     * @type {Object}
     */
    Query: function(){
        if (this._query) {
            return this._query;
        }
        // #ifdef debug
        this._trace("parsing location.search: '" + location.search);
        // #endif
        this._query = {};
        var pair, key, value, search = location.search.substring(1).split("&");
        for (var i = 0, len = search.length; i < len; i++) {
            pair = search[i];
            key = pair.substring(0, pair.indexOf("="));
            value = pair.substring(key.length + 1);
            this._query[key] = value;
        }
        return this._query;
    },
    
    /**
     * Get the domain name from a url.
     * @param {String} url The url to extract the domain from.
     * @returns The domain part of the url.
     * @type {String}
     */
    getDomainName: function(url){
        // #ifdef debug
        if (!url) {
            throw new Error("url is undefined or empty");
        }
        // #endif
        var domain = url.substring(url.indexOf("//") + 2);
        domain = domain.substring(0, domain.indexOf("/"));
        var _indexOf = domain.indexOf(":");
        if (_indexOf != -1) {
            domain = domain.substring(0, _indexOf);
        }
        return domain;
    },
    
    /**
     * Returns  a string containing the schema, domain and if present the port
     * @param {String} url The url to extract the location from
     * @return {String} The location part of the url
     */
    getLocation: function(url){
        // #ifdef debug
        if (!url) {
            throw new Error("url is undefined or empty");
        }
        // #endif
        var indexOf = url.indexOf("//");
        var loc = url.substring(indexOf + 2);
        if (loc.indexOf("/") == -1) {
            return url;
        }
        loc = loc.substring(0, loc.indexOf("/"));
        return url.substring(0, indexOf + 2) + loc;
    },
    
    /**
     * Resolves a relative url into an absolute one.
     * @param {String} url The path to resolve.
     * @return {String} The resolved url.
     */
    resolveUrl: function(url){
        // #ifdef debug
        if (!url) {
            throw new Error("url is undefined or empty");
        }
        // #endif
        var reParent = /\/[\d\w+%_\-]+\/\.\.\//;
        // If the url is a valid url we do nothing
        if (url.match(/^(http||https):\/\//)) {
            return url;
        }
        
        var path = (url.substring(0, 1) === "/") ? "" : location.pathname;
        if (path.substring(path.length - 1) !== "/") {
            path = path.substring(0, path.lastIndexOf("/") + 1);
        }
        path = path + url;
        // reduce all '/xyz/../' to just '/' 
        while (reParent.test(path)) {
            path = path.replace(reParent, "/");
        }
        
        var resolved = location.protocol + "//" + location.host + path;
        // #ifdef debug
        this._trace("resolved url '" + url + ' into ' + resolved + "'");
        // #endif
        return resolved;
    },
    
    /**
     * Appends the parameters to the given url.<br/>
     * The base url can contain existing query parameters.
     * @param {String} url The base url.
     * @param {Object} parameters The parameters to add.
     * @return {String} A new valid url with the parameters appended.
     */
    appendQueryParameters: function(url, parameters){
        // #ifdef debug
        if (!parameters) {
            throw new Error("parameters is undefined or null");
        }
        // #endif
        var q = "";
        for (var key in parameters) {
            if (parameters.hasOwnProperty(key)) {
                q += key + "=" + parameters[key] + "&";
            }
        }
        return url + ((url.indexOf("?") == -1) ? "?" : "&") + q.substring(0, q.length - 1);
    }
};

// #ifdef debug
easyXDM.Url._trace = easyXDM.Debug.getTracer("easyXDM.Url");
// #endif
