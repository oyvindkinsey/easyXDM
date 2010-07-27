/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global console, _FirebugCommandLine,  easyXDM, window, escape, unescape, isHostObject, undef, _trace, isReady, emptyFn */

// #ifdef debug

var debug = {
    _deferred: [],
    flush: function(){
        this.trace("... deferred messages ...");
        for (var i = 0, len = this._deferred.length; i < len; i++) {
            this.trace(this._deferred[i]);
        }
        this._deferred.length = 0;
        this.trace("... end of deferred messages ...");
    },
    /**
     * Logs the message to console.log if available
     * @param {String} msg The message to log
     */
    log: function(msg){
        // Uses memoizing to cache the implementation
        if (!isHostObject(window, "console") || undef(console.log)) {
            /**
             * Sets log to be an empty function since we have no output available
             * @ignore
             */
            this.log = emptyFn;
        }
        else {
            /**
             * Sets log to be a wrapper around console.log
             * @ignore
             * @param {String} msg
             */
            this.log = function(msg){
                console.log(location.host + "-" + new Date().valueOf() + ":" + msg);
            };
        }
        this.log(msg);
    },
    /**
     * Will try to trace the given message either to a DOMElement with the id "log",
     * or by using console.info.
     * @param {String} msg The message to trace
     */
    trace: function(msg){
        // Uses memoizing to cache the implementation
        if (!isReady) {
            if (this._deferred.length === 0) {
                easyXDM.whenReady(debug.flush, debug);
            }
            this._deferred.push(msg);
            this.log(msg);
        }
        else {
            var el = document.getElementById("log");
            // is there a log element present?
            if (el) {
                /**
                 * Sets trace to be a function that outputs the messages to the DOMElement with id "log"
                 * @ignore
                 * @param {String} msg
                 */
                this.trace = function(msg){
                    try {
                        el.appendChild(document.createElement("div")).appendChild(document.createTextNode(location.host + "-" + new Date().valueOf() + ":" + msg));
                        el.scrollTop = el.scrollHeight;
                    } 
                    catch (e) {
                        //In case we are unloading
                    }
                };
            }
            else if (isHostObject(window, "console") && !undef(console.info)) {
                /**
                 * Sets trace to be a wrapper around console.info
                 * @ignore
                 * @param {String} msg
                 */
                this.trace = function(msg){
                    console.info(location.host + "-" + new Date().valueOf() + ":" + msg);
                };
            }
            else {
                /**
                 * Create log window
                 * @ignore
                 */
                var domain = location.host, windowname = domain.replace(/\.|:/g, "") + "easyxdm_log", logWin;
                try {
                    logWin = window.open("", windowname, "width=800,height=200,status=0,navigation=0,scrollbars=1");
                } 
                catch (e) {
                }
                if (logWin) {
                    var doc = logWin.document;
                    el = doc.getElementById("log");
                    if (!el) {
                        doc.write("<html><head><title>easyXDM log " + domain + "</title></head>");
                        doc.write("<body><div id=\"log\"></div></body></html>");
                        doc.close();
                        el = doc.getElementById("log");
                    }
                    this.trace = function(msg){
                        try {
                            el.appendChild(doc.createElement("div")).appendChild(doc.createTextNode(location.host + "-" + new Date().valueOf() + ":" + msg));
                            el.scrollTop = el.scrollHeight;
                        } 
                        catch (e) {
                            //In case we are unloading
                        }
                    };
                    this.trace("---- new logger at " + location.href);
                }
                
                if (!el) {
                    // We are unable to use any logging
                    this.trace = emptyFn;
                }
            }
            this.trace(msg);
        }
    },
    /**
     * Creates a method usable for tracing.
     * @param {String} name The name the messages should be marked with
     * @return {Function} A function that accepts a single string as argument.
     */
    getTracer: function(name){
        return function(msg){
            debug.trace(name + ": " + msg);
        };
    }
};
debug.log("easyXDM present on '" + location.href);
easyXDM.Debug = debug;
_trace = debug.getTracer("{Private}");
// #endif
