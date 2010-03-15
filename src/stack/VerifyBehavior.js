/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape */

/**
 * @class easyXDM.stack.VerifyBehavior
 * This behavior will verify that communication with the remote end is possible, and will also sign all outgoing,
 * and verify all incoming messages. This removes the risk of someone hijacking the iframe to send malicious messages.
 * @constructor
 * @param {Object} settings
 * @cfg {Boolean} initiate If the verification should be initiated from this end.
 * @namespace easyXDM.stack
 */
easyXDM.stack.VerifyBehavior = function(settings){
    var pub, mySecret, theirSecret, verified = false;
    if (typeof settings.initiate === "undefined") {
        throw new Error("settings.initiate is not set");
    }
    function startVerification(){
        // #ifdef debug
        easyXDM.Debug.trace("VerifyBehavior: requesting verification");
        // #endif
        mySecret = Math.random().toString(16).substring(2);
        pub.down.outgoing(mySecret);
    }
    
    return (pub = {
        incoming: function(message, origin){
            var indexOf = message.indexOf("_");
            if (indexOf === -1) {
                if (message === mySecret) {
                    // #ifdef debug
                    easyXDM.Debug.trace("VerifyBehavior: verified, calling callback");
                    // #endif
                    pub.up.callback(true);
                }
                else 
                    if (!theirSecret) {
                        // #ifdef debug
                        easyXDM.Debug.trace("VerifyBehavior: returning secret");
                        // #endif
                        theirSecret = message;
                        if (!settings.initiate) {
                            startVerification();
                        }
                        pub.down.outgoing(message);
                    }
            }
            else {
                if (message.substring(0, indexOf) === theirSecret) {
                    // #ifdef debug
                    easyXDM.Debug.trace("VerifyBehavior: valid");
                    // #endif
                    pub.up.incoming(message.substring(indexOf + 1), origin);
                }
                // #ifdef debug
                else {
                    easyXDM.Debug.trace("VerifyBehavior: invalid secret:" + message.substring(0, indexOf) + ", was expecting:" + theirSecret);
                    
                }
                // #endif
            }
            
        },
        outgoing: function(message, origin, fn){
            pub.down.outgoing(mySecret + "_" + message, origin, fn);
        },
        callback: function(success){
            if (settings.initiate) {
                startVerification();
            }
        }
    });
};
