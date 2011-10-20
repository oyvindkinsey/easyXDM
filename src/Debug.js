/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global console, _FirebugCommandLine,  easyXDM, window, escape, unescape, isHostObject, undef, _trace, domIsReady, emptyFn, namespace */
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

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
    getTime: function(){
        var d = new Date(), h = d.getHours() + "", m = d.getMinutes() + "", s = d.getSeconds() + "", ms = d.getMilliseconds() + "", zeros = "000";
        if (h.length == 1) {
            h = "0" + h;
        }
        if (m.length == 1) {
            m = "0" + m;
        }
        if (s.length == 1) {
            s = "0" + s;
        }
        ms = zeros.substring(ms.length) + ms;
        return h + ":" + m + ":" + s + "." + ms;
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
                console.log(location.host + (namespace ? ":" + namespace : "") + " - " + this.getTime() + ": " + msg);
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
        if (!domIsReady) {
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
                        el.appendChild(document.createElement("div")).appendChild(document.createTextNode(location.host + (namespace ? ":" + namespace : "") + " - " + this.getTime() + ":" + msg));
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
                    console.info(location.host + (namespace ? ":" + namespace : "") + " - " + this.getTime() + ":" + msg);
                };
            }
            else {
                /**
                 * Create log window
                 * @ignore
                 */
                var domain = location.host, windowname = domain.replace(/[\-.:]/g, "") + "easyxdm_log", logWin;
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
                            el.appendChild(doc.createElement("div")).appendChild(doc.createTextNode(location.host + (namespace ? ":" + namespace : "") + " - " + this.getTime() + ":" + msg));
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
