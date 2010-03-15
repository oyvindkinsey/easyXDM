/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/**
 * @class easyXDM.Fn
 * This contains methods related to function handling, such as storing callbacks.
 * @singleton
 * @namespace easyXDM
 */
easyXDM.Fn = {
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
};
