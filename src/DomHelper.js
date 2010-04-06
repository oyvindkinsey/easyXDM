/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, isHostObject, isHostMethod */

/** 
 * @class easyXDM.DomHelper
 * Contains methods for dealing with the DOM
 * @singleton
 */
easyXDM.DomHelper = {

    /**
     * Creates a frame and appends it to the DOM.
     * @param {String} url The url the frame should be set to
     * @param {DOMElement} container Its parent element (Optional)
     * @param {Function} onLoad A method that should be called with the frames contentWindow as argument when the frame is fully loaded. (Optional)
     * @param {String} name The id/name the frame should get (Optional)
     * @return The frames DOMElement
     * @type DOMElement
     */
    createFrame: function(url, container, onLoad, name){
        // #ifdef debug
        this._trace("creating frame: " + url);
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
            this.on(frame, "load", frame.loadFn);
        }
        if (container) {
            container.appendChild(frame);
        }
        else {
            // This needs to be hidden like this, simply setting display:none and the like will cause failures in some browsers.
            frame.style.position = "absolute";
            frame.style.left = "-2000px";
            document.body.appendChild(frame);
        }
        return frame;
    },
    
    /**
     * Provides a consistent interface for adding eventhandlers
     * @param {Object} target The target to add the event to
     * @param {String} type The name of the event
     * @param {Function} listener The listener
     */
    on: function(target, type, listener, useCapture){
        // Uses memoizing to cache the implementation
        // #ifdef debug
        var trace = this._trace;
        // #endif
        if (isHostMethod(window, "addEventListener")) {
            /**
             * Set on to use the DOM level 2 addEventListener
             * https://developer.mozilla.org/en/DOM/element.on
             * @ignore
             * @param {Object} target
             * @param {String} type
             * @param {Function} listener
             */
            this.on = function(target, type, listener){
                // #ifdef debug
                trace("adding listener " + type);
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
            this.on = function(object, sEvent, fpNotify){
                // #ifdef debug
                trace("adding listener " + sEvent);
                // #endif
                object.attachEvent("on" + sEvent, fpNotify);
            };
        }
        this.on(target, type, listener);
    },
    
    /**
     * Provides a consistent interface for removing eventhandlers
     * @param {Object} target The target to remove the event from
     * @param {String} type The name of the event
     * @param {Function} listener The listener
     */
    un: function(target, type, listener, useCapture){
        // Uses memoizing to cache the implementation
        // #ifdef debug
        var trace = this._trace;
        // #endif
        if (isHostMethod(window, "removeEventListener")) {
            /**
             * Set un to use the DOM level 2 removeEventListener
             * https://developer.mozilla.org/en/DOM/element.un
             * @ignore
             * @param {Object} target
             * @param {String} type
             * @param {Function} listener
             */
            this.un = function(target, type, listener, useCapture){
                // #ifdef debug
                trace("removing listener " + type);
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
            this.un = function(object, sEvent, fpNotify){
                // #ifdef debug
                trace("removing listener " + type);
                // #endif
                object.detachEvent("on" + sEvent, fpNotify);
            };
        }
        this.un(target, type, listener);
    },
    
    /**
     * Checks for the presence of the JSON object.
     * If it is not present it will use the supplied path to load the JSON2 library.
     * This should be called in the documents head right after the easyXDM script tag.
     * http://json.org/json2.js
     * @param {String} path A valid path to json2.js
     */
    requiresJSON: function(path){
        if (!isHostObject(window, "JSON")) {
            // #ifdef debug
            easyXDM.Debug.log("loading external JSON");
            // #endif
            document.write('<script type="text/javascript" src="' + path + '"></script>');
        }
        // #ifdef debug
        else {
            easyXDM.Debug.log("native JSON found");
        }
        // #endif
    }
};

// #ifdef debug
easyXDM.DomHelper._trace = easyXDM.Debug.getTracer("easyXDM.DomHelper");
// #endif
