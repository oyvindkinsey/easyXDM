/** 
 * Contains methods for dealing with the DOM
 * @class
 */
easyXSS.DomHelper = {
    /**
     * Creates a frame and appends it to the DOM.
     * @param {String} url The url the frame should be set to
     * @param {String} name The id/name the frame should get
     * @param {DOMElement} container
     * @param {Function} onLoad A method that should be called with the frames contentWindow as argument when the frame is fully loaded.
     * @return The frames DOMElement
     * @type DOMElement
     */
    createFrame: function(url, name, container, onLoad){
        var frame;
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
            // When name is not needed, or in other browsers, 
            // we use regular createElement.
            var framesets = document.getElementsByTagName("FRAMESET");
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
            frame.name = name;
            frame.id = name;
        }
        return frame;
    },
    /**
     * Gives a consistent interface for adding eventhandlers
     * @param {DOMElement} element The DOMElement to attach the handler to
     * @param {String} event The eventname
     * @param {Function} handler The handler to attach
     */
    addEventListener: function(element, event, handler){
        if (window.addEventListener) {
            element.addEventListener(event, handler, false);
        }
        else {
            element.attachEvent("on" + event, handler);
        }
    },
    /**
     * Gives a consistent interface for removing eventhandlers
     * @param {DOMElement} element The DOMElement to remove the handler from
     * @param {String} event The eventname
     * @param {Function} handler The handler to remove
     */
    removeEventListener: function(element, event, handler){
        if (window.removeEventListener) {
            element.removeEventListener(event, handler, false);
        }
        else {
            element.detachEvent("on" + event, handler);
        }
    },
    /**
     * Checks for the precense of the JSON object.
     * If it is not precent it will use the supplied path to load the JSON2 library.
     * This should be called in the documents head right after the easyXSS script tag.
     * http://json.org/json2.js
     * @param {Object} path
     */
    requiresJSON: function(path){
        if (typeof JSON == "undefined" || !JSON) {
            // #ifdef debug
            trace("loading external JSON");
            // #endif
            document.write('<script type="text/javascript" src="' + path + '"></script>');
        }
        // #ifdef debug
        else {
            trace("native JSON found");
        }
        // #endif
    }
};
