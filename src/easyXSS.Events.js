/** 
 * @class easyXSS.Events
 * Contains methods for dealing with special events needed to support the library
 * @singleton
 */
easyXSS.Events = (function(){
    /**
     * Hashtable for storing callbacks when using hashTransport
     * @private
     */
    var _onReadyCallbacks = {};
    return {
        /**
         * Register a callback that should be called when hash.html is fully loaded.
         * @param {String} channel The name of the channel
         * @param {Function} callback The function to call
         */
        registerOnReady: function(channel, callback){
            // #ifdef debug
            easyXSS.Debug.trace("registering onReady callback for channel " + channel);
            // #endif
            _onReadyCallbacks[channel] = callback;
        },
        /**
         * Call the onReady method associated with the channel
         * @param {String} channel The name of the channel
         * @throws easyXSS.Exceptions.MissingCallbackException Throws an exception is the callback is missing
         */
        onReady: function(channel){
            // #ifdef debug
            easyXSS.Debug.trace("executing onReady callback for channel " + channel);
            // #endif
            var fn = _onReadyCallbacks[channel];
            if (fn) {
                // #ifdef debug
                easyXSS.Debug.trace("executing onReady callback for channel " + channel);
                // #endif
                fn();
                delete _onReadyCallbacks[channel];
            }
            else {
                // #ifdef debug
                easyXSS.Debug.trace("onReady callback for channel " + channel + " was not found");
                // #endif
                throw new easyXSS.Exceptions.MissingCallbackException("onReady callback for channel " + channel + " was not found");
            }
        }
    };
}());
