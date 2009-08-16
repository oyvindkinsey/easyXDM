/** 
 * @class easyXDM.Url
 * Contains methods for dealing with url's
 * @singleton
 */
easyXDM.Url = {
    /**
     * A hashtable that gives access to the documents query string
     * The hashtable is cached internally
     * @returns A hashtable populated with keys and values from the querystring
     * @type {Object}
     */
    Query: function(){
        if (this._query) {
            return this._query;
        }
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
     * Get the domain name from a url
     * @param {String} url The url to extract the domain from
     * @returns The domain part of the url
     * @type {String}
     */
    getDomainName: function(url){
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
        var indexOf = url.indexOf("//");
        var loc = url.substring(indexOf + 2);
        loc = loc.substring(0, loc.indexOf("/"));
        return url.substring(0, indexOf + 2) + loc;
    },
	/**
	 * Resolves a path to a complete url
	 * @param {String} url The path to resolve
	 * @return {String} The resolved url 
	 */
    resolveUrl: function(url){
        // If the url is a valid url we do nothing
        if (url.match(/^(http||https):\/\//)) {
            return url;
        }
        // If the url is relative to the root  
        if (url.substring(0, 1) == "/") {
            return location.protocol + "//" + location.host + url;
        }
        // If the url is relative to the current directory
        return location.href.substring(0, location.href.lastIndexOf("/") + 1) + url;
    }
};