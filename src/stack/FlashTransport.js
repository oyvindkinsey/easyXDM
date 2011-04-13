/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global global, easyXDM, window, getLocation, appendQueryParameters, createFrame, debug, apply, whenReady, IFRAME_PREFIX, namespace, getDomainName*/
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

/**
 * @class easyXDM.stack.FlashTransport
 * FlashTransport is a transport class that uses an SWF with LocalConnection to pass messages back and forth.
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The transports configuration.
 * @cfg {String} remote The remote domain to communicate with.
 * @cfg {String} secret the pre-shared secret used to secure the communication.
 * @cfg {String} swf The path to the swf file
 */
easyXDM.stack.FlashTransport = function(config){
    // #ifdef debug
    var trace = debug.getTracer("easyXDM.stack.FlashTransport");
    trace("constructor");
    if (!config.swf) {
        throw new Error("Path to easyxdm.swf is missing");
    }
    // #endif
    var pub, // the public interface
 frame, send, targetOrigin, swf, swfContainer, ns = (namespace ? namespace + "." : "");
    
    function onMessage(message){
        setTimeout(function(){
            // #ifdef debug
            trace("received message");
            // #endif
            pub.up.incoming(message, targetOrigin);
        }, 0);
    }
    
    /**
     * This method adds the SWF to the DOM and prepares the initialization of the channel
     */
    function addSwf(callback){
        var url = config.swf;
        var id = "easyXDM_swf_" + Math.floor(Math.random() * 10000);
        var init = ns + "easyXDM.Fn.get(\"flash_" + id + "_init\")";
        
        // prepare the init function that will fire once the swf is ready
        easyXDM.Fn.set("flash_" + id + "_init", function(){
            easyXDM.stack.FlashTransport.__swf = swf = swfContainer.firstChild;
            callback();
        });
        
        // create the container that will hold the swf
        swfContainer = document.createElement('div');
        apply(swfContainer.style, {
            height: "1px",
            width: "1px",
            postition: "abosolute",
            left: 0,
            top: 0
        });
        document.body.appendChild(swfContainer);
        
        // create the object/embed
        var flashVars = "proto=" + global.location.protocol + "&domain=" + getDomainName(global.location.href) + "&init=" + init;
        swfContainer.innerHTML = "<object height='1' width='1' type='application/x-shockwave-flash' id='" + id + "' data='" + url + "'>" +
        "<param name='allowScriptAccess' value='always'></param>" +
        "<param name='wmode' value='transparent'>" +
        "<param name='movie' value='" +
        url +
        "'></param>" +
        "<param name='flashvars' value='" +
        flashVars +
        "'></param>" +
        "<embed type='application/x-shockwave-flash' FlashVars='" +
        flashVars +
        "' allowScriptAccess='always' wmode='transparent' src='" +
        url +
        "' height='1' width='1'></embed>" +
        "</object>";
    }
    
    return (pub = {
        outgoing: function(message, domain, fn){
            swf.postMessage(config.channel, message);
            if (fn) {
                fn();
            }
        },
        destroy: function(){
            // #ifdef debug
            trace("destroy");
            // #endif
            try {
                swf.destroyChannel(config.channel);
            } 
            catch (e) {
            }
            swf = null;
            if (frame) {
                frame.parentNode.removeChild(frame);
                frame = null;
            }
        },
        onDOMReady: function(){
            // #ifdef debug
            trace("init");
            // #endif
            
            targetOrigin = getLocation(config.remote);
            swf = easyXDM.stack.FlashTransport.__swf;
            
            /**
             * Prepare the code that will be run after the swf has been intialized
             */
            var fn = function(){
                // set up the omMessage handler
                if (config.isHost) {
                    easyXDM.Fn.set("flash_" + config.channel + "_onMessage", function(message){
                        if (message == config.channel + "-ready") {
                            easyXDM.Fn.set("flash_" + config.channel + "_onMessage", onMessage);
                            setTimeout(function(){
                                // #ifdef debug
                                trace("firing onReady");
                                // #endif
                                pub.up.callback(true);
                            }, 0);
                        }
                    });
                }
                else {
                    easyXDM.Fn.set("flash_" + config.channel + "_onMessage", onMessage);
                }
                
                // create the channel
                swf.createChannel(config.channel, config.remote, config.isHost, ns + "easyXDM.Fn.get(\"flash_" + config.channel + "_onMessage\")", config.secret);
                
                if (config.isHost) {
                    // set up the iframe
                    apply(config.props, {
                        src: appendQueryParameters(config.remote, {
                            xdm_e: getLocation(location.href),
                            xdm_c: config.channel,
                            xdm_s: config.secret,
                            xdm_p: 6 // 6 = FlashTransport
                        }),
                        name: IFRAME_PREFIX + config.channel + "_provider"
                    });
                    frame = createFrame(config);
                }
                else {
                    // signal to the remote end that we are ready, and fire the callback
                    swf.postMessage(config.channel, config.channel + "-ready");
                    setTimeout(function(){
                        // #ifdef debug
                        trace("firing onReady");
                        // #endif
                        pub.up.callback(true);
                    }, 0);
                }
            };
            
            if (swf) {
                // if the swf is in place and we are the consumer
                fn();
            }
            else {
                // if the swf does not yet exist
                addSwf(fn);
            }
        },
        init: function(){
            whenReady(pub.onDOMReady, pub);
        }
    });
};
