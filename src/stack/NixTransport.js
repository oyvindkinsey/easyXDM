/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global global, easyXDM, window, escape, unescape, getLocation, appendQueryParameters, createFrame, debug, un, on*/

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
            window.execScript('Set nixProxy_%%name%% = Nothing'.replace(/%%name%%/g, config.channel), 'vbscript');
            proxy = null;
            if (frame) {
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
                // set up the iframe
                frame = createFrame(appendQueryParameters(config.remote, {
                    xdm_e: location.protocol + "//" + location.host,
                    xdm_c: config.channel,
                    xdm_s: config.secret,
                    xdm_p: 3 // 3 = NixTransport
                }), config.container);
                
                try {
                    var vbScript = 'Class NixProxy%%name%%\n' +
                    '    Private m_parent\n' +
                    '    Private m_child\n' +
                    '    Private m_Auth\n' +
                    '\n' +
                    '    Public Sub SetAuth(auth)\n' +
                    '        If isEmpty(m_Auth) Then m_Auth = auth\n' +
                    '    End Sub\n' +
                    '\n' +
                    '    Public Sub SetParent(obj)\n' +
                    '        SET m_parent = obj\n' +
                    '    End Sub\n' +
                    '    Public Sub SetChild(obj)\n' +
                    '        SET m_child = obj\n' +
                    '        m_parent.ready()\n' +
                    '    End Sub\n' +
                    '\n' +
                    '    Public Sub SendToParent(data, auth)\n' +
                    '        If m_Auth = auth Then m_parent.send(data) Else MsgBox("wrong auth")\n' +
                    '    End Sub\n' +
                    '\n' +
                    '    Public Sub SendToChild(data, auth)\n' +
                    '        If m_Auth = auth Then m_child.send(data) Else MsgBox("wrong auth")\n' +
                    '    End Sub\n' +
                    'End Class\n' +
                    'Set nixProxy_%%name%% = New NixProxy%%name%%\n';
                    window.execScript(vbScript.replace(/%%name%%/g, config.channel), 'vbscript');
                    proxy = (new Function("return nixProxy_" + config.channel))();
                    proxy.SetAuth(config.secret);
                    proxy.SetParent({
                        send: function(msg){
                            setTimeout(function(){
                                // #ifdef debug
                                trace("received message");
                                // #endif
                                pub.up.incoming(msg, targetOrigin);
                            }, 0);
                        },
                        ready: function(){
                            setTimeout(function(){
                                // #ifdef debug
                                trace("firing onReady");
                                // #endif
                                pub.up.callback(true);
                            }, 0);
                        }
                    });
                    send = function(msg){
                        // #ifdef debug
                        trace("sending message");
                        // #endif
                        proxy.SendToChild(msg, config.secret);
                    };
                } 
                catch (e) {
                    throw new Error("Could not set up VBScript Host:" + e.message);
                }
                frame.contentWindow.opener = proxy;
            }
            else {
                window.opener.SetChild({
                    send: function(msg){
                        //global is needed here to avoid a strange scope error
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
                    window.opener.SendToParent(msg, config.secret);
                };
                
                setTimeout(function(){
                    // #ifdef debug
                    trace("firing onReady");
                    // #endif
                    pub.up.callback(true);
                }, 0);
            }
        }
    });
};
