/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/**
 * @class easyXDM.transport.PostMessageTransport
 * PostMessageTransport is a transport class that uses HTML5 postMessage for communication
 * <a href="http://msdn.microsoft.com/en-us/library/ms644944(VS.85).aspx">http://msdn.microsoft.com/en-us/library/ms644944(VS.85).aspx</a>
 * <a href="https://developer.mozilla.org/en/DOM/window.postMessage">https://developer.mozilla.org/en/DOM/window.postMessage</a>
 * @constructor
 * @param {easyXDM.configuration.TransportConfiguration} config The transports configuration.
 * @param {Function} onReady A method that should be called when the transport is ready
 * @cfg {Mixed} local Any value that will evaluate as True
 * @cfg {String} remote The url to the remote document to interface with
 * @cfg {String} channel The name of the channel to use
 * @cfg {Function} onMessage The method that should handle incoming messages.<br/> This method should accept two arguments, the message as a string, and the origin as a string.
 * @namespace easyXDM.transport
 */
easyXDM.transport.PostMessageTransport = function(config, onReady){
    if (!window.postMessage) {
        throw new Error("This browser does not support window.postMessage");
    }
    // #ifdef debug
    easyXDM.Debug.trace("easyXDM.transport.PostMessageTransport.constructor");
    // #endif
    // If no protocol is set then it means this is the host
    var query = easyXDM.Url.Query(), isHost = (typeof query.xdm_p === "undefined");
    if (!isHost) {
        config.channel = query.xdm_c;
        config.remote = decodeURIComponent(query.xdm_e);
    }
    var _callerWindow, _targetOrigin = easyXDM.Url.getLocation(config.remote), _window_onMessageImplementation;
    
    /**
     * Resolves the origin from the event object
     * @private
     * @param {Object} event The messageevent
     * @return {String} The scheme, host and port of the origin
     */
    function _getOrigin(event){
        if (event.origin) {
            // This is the HTML5 property
            return event.origin;
        }
        if (event.uri) {
            // From earlier implementations 
            return easyXDM.Url.getLocation(event.uri);
        }
        if (event.domain) {
            // This is the last option and will fail if the 
            // origin is not using the same schema as we are
            return location.protocol + "//" + event.domain;
        }
        throw "Unable to retrieve the origin of the event";
    }
    
    /**
     * Delays calling onReady until the class has been returned
     * @private
     */
    function _onReady(){
        if (onReady) {
            window.setTimeout(onReady, 5);
        }
    }
    
    /**
     * The main onMessage handler. This will pass on the event to the real implementation
     * @private
     * @param {Object} event The messageevent
     */
    function _window_onMessage(event){
        // #ifdef debug
        easyXDM.Debug.trace("onMessage");
        // #endif
        _window_onMessageImplementation(event);
    }
    easyXDM.DomHelper.addEventListener(window, "message", _window_onMessage);
    
    /**
     * This is the main implementation for the onMessage event.<br/>
     * It checks the validity of the origin and passes the message on if appropriate.
     * @private
     * @param {Object} event The messageevent
     */
    function _handleMessage(event){
        var origin = _getOrigin(event);
        // #ifdef debug
        easyXDM.Debug.trace("received message '" + event.data + "' from " + origin);
        // #endif
        if (origin == _targetOrigin && event.data.substring(0, config.channel.length + 1) == config.channel + " ") {
            config.onMessage(event.data.substring(config.channel.length + 1), origin);
        }
    }
    
    /**
     * Used by local to fire the onReady method.
     * After being notified by the remote, this method will replace the
     * onMessage handler with _handleMessage and fire onReady
     * @private
     * @param {Object} event The messageevent
     */
    function _waitForReady(event){
        if (event.data == config.channel + "-ready") {
            // #ifdef debug
            easyXDM.Debug.trace("firing onReady");
            // #endif
            // We use memoization to avoid having to run this check each time
            _window_onMessageImplementation = _handleMessage;
            _onReady();
        }
        // #ifdef debug
        else {
            easyXDM.Debug.trace("received unexpected message: " + event.data + ", expected " + config.channel + "-ready");
        }
        // #endif
    }
    /**
     * Destroy all that we can destroy :)
     */
    this.destroy = function(){
        // #ifdef debug
        easyXDM.Debug.trace("destroying transport");
        // #endif
        easyXDM.DomHelper.removeEventListener(window, "message", _window_onMessage);
        if (isHost) {
            _callerWindow.parentNode.removeChild(_callerWindow);
            _callerWindow = null;
        }
    };
    
    
    /** 
     * Sends the message using the postMethod method available on the window object
     * @param {String} message The message to send
     */
    this.postMessage = (function(){
        // Set up the messaging differently dependin on being local or remote
        if (isHost) {
            _window_onMessageImplementation = _waitForReady;
            _callerWindow = easyXDM.DomHelper.createFrame(easyXDM.Url.appendQueryParameters(config.remote, {
                xdm_e: location.protocol + "//" + location.host,
                xdm_c: config.channel,
                xdm_p: 1 // 1 = PostMessage
            }), config.container);
            return function(message){
                // #ifdef debug
                easyXDM.Debug.trace("sending message '" + message + "' to iframe " + _targetOrigin);
                // #endif
                _callerWindow.contentWindow.postMessage(config.channel + " " + message, _targetOrigin);
            };
        }
        else {
            _window_onMessageImplementation = _handleMessage;
            // #ifdef debug
            easyXDM.Debug.trace("firing onReady");
            // #endif
            window.parent.postMessage(config.channel + "-ready", _targetOrigin);
            _onReady();
            return function(message){
                // #ifdef debug
                easyXDM.Debug.trace("sending message '" + message + "' to parent " + _targetOrigin);
                // #endif
                window.parent.postMessage(config.channel + " " + message, _targetOrigin);
            };
            
        }
    }());
};
