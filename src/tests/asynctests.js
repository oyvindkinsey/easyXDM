/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyTest, easyXDM, window, modules*/
var REMOTE = (function(){
    var remote = location.href;
    switch (location.host) {
        case "provider.easyxdm.net":
            location.href = remote.replace("provider", "consumer");
            break;
        case "easyxdm.net":
            remote = remote.replace("easyxdm.net", "consumer.easyxdm.net");
            break;
        case "consumer.easyxdm.net":
            remote = remote.replace("consumer", "provider");
            break;
        case "xdm1":
            remote = remote.replace("xdm1", "xdm2");
            break;
    }
    return remote.substring(0, remote.lastIndexOf("/"));
}());

var LOCAL = location.protocol + "//" + location.host + location.pathname.substring(0, location.pathname.lastIndexOf("/"));

function runTests(){
    var i = 0;
    easyTest.test([{
        name: "test easyXDM.Socket{SameOriginTransport}",
        setUp: function(){
            this.expectedMessage = ++i + "_abcd1234%@¤/";
        },
        steps: [{
            name: "Asynchronously load the dependencies",
            timeout: 5000,
            run: function(){
                var scope = this;
                var basePath = REMOTE + "/../";
                easyXDM.async(basePath, "socket", {
                    remote: REMOTE,
                    protocol: "0"
                }, function(){
                    scope.notifyResult(true);
                });
            }
        }, {
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                var messages = 0;
                this.transport = new easyXDM.Socket({
                    remote: REMOTE + "/test_async.html",
                    protocol: "0",
                    swf: "../easyxdm.swf",
                    local: "../name.html",
                    remoteHelper: REMOTE + "/../name.html",
                    onMessage: function(message, origin){
                        if (scope.expectedMessage === message) {
                            if (++messages === 2) {
                                scope.notifyResult(true);
                            }
                        }
                    },
                    onReady: function(){
                        scope.notifyResult(true);
                    }
                });
            }
        }, {
            name: "message is echoed back",
            timeout: 5000,
            run: function(){
                this.transport.postMessage(this.expectedMessage);
                this.transport.postMessage(this.expectedMessage);
            }
        }, {
            name: "destroy",
            run: function(){
                this.transport.destroy();
                return ((document.getElementsByTagName("iframe").length === 0));
            }
        }]
    }]);
}
