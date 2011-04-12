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
 * @class easyXDM.stack.NixTransport
 * NixTransport is a transport class that uses the strange fact that in IE <8, the window.opener property can be written to and read from all windows.<br/>
 * This is used to pass methods that are able to relay messages back and forth. To avoid context-leakage a VBScript (COM) object is used to relay all the strings.<br/>
 * This transport is loosely based on the work done by <a href="https://issues.apache.org/jira/browse/SHINDIG-416">Shindig</a>
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The transports configuration.
 * @cfg {String} remote The remote domain to communicate with.
 * @cfg {String} secret the pre-shared secret used to secure the communication.
 */
easyXDM.stack.NixTransport = function(config){
    // #ifdef debug
    var trace = debug.getTracer("easyXDM.stack.NixMessageTransport");
    trace("constructor");
    // #endif
    var pub, // the public interface
 frame, send, targetOrigin, proxy;
    
    return (pub = {
        outgoing: function(message, domain, fn){
            send(message);
            if (fn) {
                fn();
            }
        },
        destroy: function(){
            // #ifdef debug
            trace("destroy");
            // #endif
            proxy = null;
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
            if (config.isHost) {
                try {
                    if (!isHostMethod(window, "getNixProxy")) {
                        window.execScript('Class NixProxy\n' +
                        '    Private m_parent, m_child, m_Auth\n' +
                        '\n' +
                        '    Public Sub SetParent(obj, auth)\n' +
                        '        If isEmpty(m_Auth) Then m_Auth = auth\n' +
                        '        SET m_parent = obj\n' +
                        '    End Sub\n' +
                        '    Public Sub SetChild(obj)\n' +
                        '        SET m_child = obj\n' +
                        '        m_parent.ready()\n' +
                        '    End Sub\n' +
                        '\n' +
                        // The auth string, which is a pre-shared key between the parent and the child, 
                        // and that can only be set once by the parent, secures the communication, and also serves to provide
                        // 'proof' of the origin of the messages.
                        // Before passing the message on to the recipent we convert the message into a primitive, 
                        // this mitigates modifying .toString as an attack vector.
                        '    Public Sub SendToParent(data, auth)\n' +
                        '        If m_Auth = auth Then m_parent.send(CStr(data))\n' +
                        '    End Sub\n' +
                        '    Public Sub SendToChild(data, auth)\n' +
                        '        If m_Auth = auth Then m_child.send(CStr(data))\n' +
                        '    End Sub\n' +
                        'End Class\n' +
                        'Function getNixProxy()\n' +
                        '    Set GetNixProxy = New NixProxy\n' +
                        'End Function\n', 'vbscript');
                    }
                    proxy = getNixProxy();
                    proxy.SetParent({
                        send: function(msg){
                            // #ifdef debug
                            trace("received message");
                            // #endif
                            pub.up.incoming(msg, targetOrigin);
                        },
                        ready: function(){
                            setTimeout(function(){
                                // #ifdef debug
                                trace("firing onReady");
                                // #endif
                                pub.up.callback(true);
                            }, 0);
                        }
                    }, config.secret);
                    send = function(msg){
                        // #ifdef debug
                        trace("sending message");
                        // #endif
                        proxy.SendToChild(msg, config.secret);
                    };
                } 
                catch (e1) {
                    throw new Error("Could not set up VBScript NixProxy:" + e1.message);
                }
                // set up the iframe
                apply(config.props, {
                    src: appendQueryParameters(config.remote, {
                        xdm_e: getLocation(location.href),
                        xdm_c: config.channel,
                        xdm_s: config.secret,
                        xdm_p: 3 // 3 = NixTransport
                    }),
                    name: IFRAME_PREFIX + config.channel + "_provider"
                });
                frame = createFrame(config);
                frame.contentWindow.opener = proxy;
            }
            else {
                // This is to mitigate origin-spoofing
                if (document.referrer && getLocation(document.referrer) != query.xdm_e) {
                    window.top.location = query.xdm_e;
                }
                try {
                    // by storing this in a variable we negate replacement attacks
                    proxy = window.opener;
                } 
                catch (e2) {
                    throw new Error("Cannot access window.opener");
                }
                proxy.SetChild({
                    send: function(msg){
                        // the timeout is necessary to have execution continue in the correct context
                        global.setTimeout(function(){
                            // #ifdef debug
                            trace("received message");
                            // #endif
                            pub.up.incoming(msg, targetOrigin);
                        }, 0);
                    }
                });
                
                send = function(msg){
                    // #ifdef debug
                    trace("sending");
                    // #endif
                    proxy.SendToParent(msg, config.secret);
                };
                setTimeout(function(){
                    // #ifdef debug
                    trace("firing onReady");
                    // #endif
                    pub.up.callback(true);
                }, 0);
            }
        },
        init: function(){
            whenReady(pub.onDOMReady, pub);
        }
    });
};
