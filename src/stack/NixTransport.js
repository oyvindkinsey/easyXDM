/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global GetNixProxy, easyXDM, window, escape, unescape, getLocation, appendQueryParameters, createFrame, debug, un, on, isHostMethod*/

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
        outgoing: function(message, domain){
            send(message);
        },
        destroy: function(){
            // #ifdef debug
            trace("destroy");
            // #endif
            if (frame) {
                proxy = null;
                frame.parentNode.removeChild(frame);
                frame = null;
            }
        },
        init: function(){
            // #ifdef debug
            trace("init");
            // #endif
            targetOrigin = getLocation(config.remote);
            if (config.isHost) {
                try {
                    if (!isHostMethod(window, "GetNixProxy")) {
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
                        'Function GetNixProxy()\n' +
                        '    Set GetNixProxy = New NixProxy\n' +
                        'End Function\n', 'vbscript');
                    }
                    proxy = GetNixProxy();
                    proxy.SetParent({
                        send: function(msg){
                            // #ifdef debug
                            trace("received message");
                            // #endif
                            pub.up.incoming(msg, targetOrigin);
                        },
                        ready: function(){
                            // #ifdef debug
                            trace("firing onReady");
                            // #endif
                            pub.up.callback(true);
                        }
                    }, config.secret);
                    send = function(msg){
                        // #ifdef debug
                        trace("sending message");
                        // #endif
                        proxy.SendToChild(msg, config.secret);
                    };
                } 
                catch (e) {
                    throw new Error("Could not set up VBScript NixProxy:" + e.message);
                }
                // set up the iframe
                frame = createFrame(appendQueryParameters(config.remote, {
                    xdm_e: location.protocol + "//" + location.host,
                    xdm_c: config.channel,
                    xdm_s: config.secret,
                    xdm_p: 3 // 3 = NixTransport
                }), config.container);
                frame.contentWindow.opener = proxy;
            }
            else {
                window.opener.SetChild({
                    send: function(msg){
                        // #ifdef debug
                        trace("received message");
                        // #endif
                        pub.up.incoming(msg, targetOrigin);
                    }
                });
                
                send = function(msg){
                    // #ifdef debug
                    trace("sending");
                    // #endif
                    window.opener.SendToParent(msg, config.secret);
                };
                // #ifdef debug
                trace("firing onReady");
                // #endif
                pub.up.callback(true);
            }
        }
    });
};
