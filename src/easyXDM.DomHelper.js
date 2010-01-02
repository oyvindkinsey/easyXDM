/** 
 * @class easyXDM.DomHelper
 * Contains methods for dealing with the DOM
 * @singleton
 */
easyXDM.DomHelper = {
    /**
     * Creates a frame and appends it to the DOM.
     * @param {String} url The url the frame should be set to
     * @param {String} name The id/name the frame should get
     * @param {DOMElement} container
     * @param {Function} onLoad A method that should be called with the frames contentWindow as argument when the frame is fully loaded.
     * @return The frames DOMElement
     * @type DOMElement
     */
    createFrame: function(url, container, onLoad, name){
        // #ifdef debug
        easyXDM.Debug.trace("creating frame pointing to " + url);
        // #endif
        var frame;
        var framesets = document.getElementsByTagName("FRAMESET");
        if (name && window.attachEvent) {
            // Internet Explorer does not support setting the 
            // name om DOMElements created in Javascript.
            // A workaround is to insert HTML and have the browser parse
            // and instantiate the element.
            var span = document.createElement("span");
            document.body.appendChild(span);
            span.innerHTML = '<iframe style="position:absolute;left:-2000px;" src="' + url + '" id="' + name + '" name="' + name + '"></iframe>';
            frame = document.getElementById(name);
            if (onLoad) {
                this.addEventListener(frame, "load", function(){
                    onLoad(frame.contentWindow);
                });
            }
        }
        else {
            if (!container && framesets && framesets.length > 0) {
                frame = document.createElement("FRAME");
                frame.src = url;
                if (onLoad) {
                    this.addEventListener(frame, "load", function(){
                        onLoad(frame.contentWindow);
                    });
                }
                framesets[0].appendChild(frame);
            }
            else {
                frame = document.createElement("IFRAME");
                frame.src = url;
                if (onLoad) {
                    this.addEventListener(frame, "load", function(){
                        onLoad(frame.contentWindow);
                    });
                }
                if (container) {
                    container.appendChild(frame);
                }
                else {
                    frame.style.position = "absolute";
                    frame.style.left = "-2000px";
                    document.body.appendChild(frame);
                }
            }
            if (name) {
                frame.id = frame.name = name;
            }
        }
        return frame;
    },
    /**
     * Provides a consistent interface for adding eventhandlers
     * @param {Object} target The target to add the event to
     * @param {String} type The name of the event
     * @param {Function} listener The listener
     */
    addEventListener: function(target, type, listener, useCapture){
        // Uses memoizing to cache the implementation
        if (window.addEventListener) {
            /**
             * Set addEventListener to use the DOM level 2 addEventListener
             * https://developer.mozilla.org/en/DOM/element.addEventListener
             * @ignore
             * @param {Object} target
             * @param {String} type
             * @param {Function} listener
             */
            easyXDM.DomHelper.addEventListener = function(target, type, listener, useCapture){
                // #ifdef debug
                easyXDM.Debug.trace("adding listener " + type);
                // #endif
                target.addEventListener(type, listener, useCapture);
            };
        }
        else {
            /**
             * Set addEventlistener to a wrapper around the IE spesific attachEvent
             * http://msdn.microsoft.com/en-us/library/ms536343%28VS.85%29.aspx
             * @ignore
             * @param {Object} object
             * @param {String} sEvent
             * @param {Function} fpNotify
             */
            easyXDM.DomHelper.addEventListener = function(object, sEvent, fpNotify){
                // #ifdef debug
                easyXDM.Debug.trace("adding listener " + sEvent);
                // #endif
                object.attachEvent("on" + sEvent, fpNotify);
            };
        }
        easyXDM.DomHelper.addEventListener(target, type, listener);
    },
    /**
     * Provides a consistent interface for removing eventhandlers
     * @param {Object} target The target to remove the event from
     * @param {String} type The name of the event
     * @param {Function} listener The listener
     */
    removeEventListener: function(target, type, listener, useCapture){
        // Uses memoizing to cache the implementation
        var removeEventListener;
        if (window.removeEventListener) {
            /**
             * Set removeEventListener to use the DOM level 2 removeEventListener
             * https://developer.mozilla.org/en/DOM/element.removeEventListener
             * @ignore
             * @param {Object} target
             * @param {String} type
             * @param {Function} listener
             */
            removeEventListener = function(target, type, listener, useCapture){
                target.removeEventListener(type, listener, useCapture);
            };
        }
        else {
            /**
             * Set removeEventlistener to a wrapper around the IE spesific detachEvent
             * http://msdn.microsoft.com/en-us/library/ms536411%28VS.85%29.aspx
             * @ignore
             * @param {Object} object
             * @param {String} sEvent
             * @param {Function} fpNotify
             */
            removeEventListener = function(object, sEvent, fpNotify){
                object.detachEvent("on" + sEvent, fpNotify);
            };
        }
        removeEventListener(target, type, listener);
        easyXDM.DomHelper.removeEventListener = removeEventListener;
    },
    /**
     * Checks for the precense of the JSON object.
     * If it is not precent it will use the supplied path to load the JSON2 library.
     * This should be called in the documents head right after the easyXDM script tag.
     * http://json.org/json2.js
     * @param {String} path A valid path to json2.js
     */
    requiresJSON: function(path){
        if (typeof JSON == "undefined" || !JSON) {
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
