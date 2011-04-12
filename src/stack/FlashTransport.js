/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global global, getNixProxy, easyXDM, window, escape, unescape, getLocation, appendQueryParameters, createFrame, debug, un, on, isHostMethod, apply, query, whenReady, IFRAME_PREFIX*/
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
    // #endif
    var pub, // the public interface
 frame, send, targetOrigin, swf, swfContainer, onInit;
    
    function onMessage(message){
        trace("receiving");
        setTimeout(function(){
            // #ifdef debug
            trace("received message");
            // #endif
            pub.up.incoming(message, targetOrigin);
        }, 0);
    }
    
    function addSwf(){
    
        var url = config.swf;
        var id = "easyXDM_swf_" + Math.floor(Math.random() * 10000);
        var init = "easyXDM.Fn.get(\"flash_" + id + "_init\")";
        
        easyXDM.Fn.set("flash_" + id + "_init", function(){
        
            easyXDM.stack.FlashTransport.__swf = swf = swfContainer.firstChild;
            if (onInit) {
                onInit();
                onInit = null;
            }
        });
        
        swfContainer = document.createElement('div');
        swfContainer.style.height = '1px';
        swfContainer.style.width = '1px';
        
        var html = "<object height='1' width='1' type='application/x-shockwave-flash' id='" + id + "' data='" + url + "'>" +
        "<param name='allowScriptAccess' value='always'></param>" +
        "<param name='movie' value='" +
        url +
        "'></param>" +
        "<param name='flashvars' value='log=console.log&init=" +
        init +
        "'></param>" +
        "<embed type='application/x-shockwave-flash' allowScriptAccess='always' src='" +
        url +
        "' height='1' width='1'></embed>" +
        "</object>";
        
        document.body.appendChild(swfContainer);
        swfContainer.innerHTML = html;
    }
    
    return (pub = {
        outgoing: function(message, domain, fn){
            trace("sending");
            swf.postMessage(config.channel, message);
            if (fn) {
                fn();
            }
        },
        destroy: function(){
            // #ifdef debug
            trace("destroy");
            // #endif
            swf.destroyChannel(config.channel);
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
            
            var fn = function(){
                var id = Math.floor(Math.random() * 10000);
                
                // set up the omMessage handler
                if (config.isHost) {
                    easyXDM.Fn.set("flash_" + id + "_onMessage", function(message){
                        if (message == config.channel + "-ready") {
                            trace("ready");
                            easyXDM.Fn.set("flash_" + id + "_onMessage", onMessage);
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
                    easyXDM.Fn.set("flash_" + id + "_onMessage", onMessage);
                }
                
                // create the channel
                swf.createChannel(config.channel, config.remote, config.isHost, "easyXDM.Fn.get(\"flash_" + id + "_onMessage\")", config.secret);
                if (!config.isHost) {
                    swf.postMessage(config.channel, config.channel + "-ready");
                    setTimeout(function(){
                        // #ifdef debug
                        trace("firing onReady");
                        // #endif
                        pub.up.callback(true);
                    }, 0);
                }
            };
            
            if (config.isHost) {
                if (swf) {
                    fn();
                }
                else {
                    // we need to add the flash to the document
                    addSwf();
                    onInit = fn;
                }
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
                addSwf();
                onInit = fn;
            }
            
            
        },
        init: function(){
            whenReady(pub.onDOMReady, pub);
        }
    });
};
