/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/**
 * @class easyXDM.transport.BestAvailableTransport
 * BestAvailableTransport is a transport class that uses the best transport available.<br/>
 * It does not know anything about the internals of the underlying transports that are used, only the prerequisites needed.
 * This class will first try to use the PostMessageTransport<br/>
 * then the NameTransport if the <code>remoteHelper</code> parameter is set,<br/>
 * and at last the HashTransport.<br/>
 * The config parameter should contain all parameters needed for the different transports.
 * @constructor
 * @param {easyXDM.configuration.TransportConfiguration} config The transports configuration.
 * @param {Function} onReady A method that should be called when the transport is ready
 * @namespace easyXDM.transport
 */
easyXDM.transport.BestAvailableTransport = function(config, onReady){
    var query = easyXDM.Url.Query(), Transport;
    // #ifdef debug
    easyXDM.Debug.trace("easyXDM.transport.BestAvailableTransport.constructor");
    // #endif
    
    // If no protocol is set then it means this is the host
    if (typeof query.xdm_p === "undefined") {
        config.channel = (config.channel) ? config.channel : "default";
        if (window.postMessage) {
            Transport = easyXDM.transport.PostMessageTransport;
        }
        else {
            if (config.remoteHelper) {
                Transport = easyXDM.transport.NameTransport;
            }
            else {
                Transport = easyXDM.transport.HashTransport;
            }
        }
    }
    else {
        switch (query.xdm_p) {
            case "0":
                Transport = easyXDM.transport.HashTransport;
                break;
            case "1":
                Transport = easyXDM.transport.PostMessageTransport;
                break;
            case "2":
                Transport = easyXDM.transport.NameTransport;
                break;
        }
    }
    
    return new Transport(config, onReady);
};


