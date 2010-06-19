/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyTest, easyXDM, window*/
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

function runTests(){
    easyTest.test([/**Tests for the presence of namespaces and classes*/{
        name: "Check that the library is complete",
        steps: [{
            name: "check for the presence of easyXDM",
            run: function(){
                if (this.Assert.isObject(easyXDM) && this.Assert.isString(easyXDM.version)) {
                    this.log("found easyXDM, version=" + easyXDM.version);
                    return true;
                }
                return false;
            }
        }, {
            name: "check for the presence of easyXDM.DomHelper",
            run: function(){
                return this.Assert.isObject(easyXDM.DomHelper);
            }
        }, {
            name: "check for the presence of easyXDM.Socket",
            run: function(){
                return this.Assert.isFunction(easyXDM.Socket);
            }
        }, {
            name: "check for the presence of easyXDM.Rpc",
            run: function(){
                return this.Assert.isFunction(easyXDM.Rpc);
            }
        }, {
            name: "check for the presence of easyXDM.stack",
            run: function(){
                return this.Assert.isObject(easyXDM.stack);
            }
        }, {
            name: "check for the presence of easyXDM.stack.PostMessageTransport",
            run: function(){
                return this.Assert.isFunction(easyXDM.stack.PostMessageTransport);
            }
        }, {
            name: "check for the presence of easyXDM.stack.NixTransport",
            run: function(){
                return this.Assert.isFunction(easyXDM.stack.NixTransport);
            }
        }, {
            name: "check for the presence of easyXDM.stack.NameTransport",
            run: function(){
                return this.Assert.isFunction(easyXDM.stack.NameTransport);
            }
        }, {
            name: "check for the presence of easyXDM.stack.HashTransport",
            run: function(){
                return this.Assert.isFunction(easyXDM.stack.HashTransport);
            }
        }, {
            name: "check for the presence of easyXDM.stack.ReliableBehavior",
            run: function(){
                return this.Assert.isFunction(easyXDM.stack.ReliableBehavior);
            }
        }, {
            name: "check for the presence of easyXDM.stack.QueueBehavior",
            run: function(){
                return this.Assert.isFunction(easyXDM.stack.QueueBehavior);
            }
        }, {
            name: "check for the presence of easyXDM.stack.VerifyBehavior",
            run: function(){
                return this.Assert.isFunction(easyXDM.stack.VerifyBehavior);
            }
        }, {
            name: "check for the presence of easyXDM.stack.RpcBehavior",
            run: function(){
                return this.Assert.isFunction(easyXDM.stack.RpcBehavior);
            }
        }]
    }, {
        name: "test easyXDM.Socket{PostMessageTransport}",
        runIf: function(){
            if (typeof window.postMessage === "undefined") {
                return "This test requires the HTML5 postMessage interface.";
            }
        },
        
        setUp: function(){
            this.expectedMessage = "3abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                var messages = 0;
                this.transport = new easyXDM.Socket({
                    protocol: "1",
                    local: "../name.html",
                    remote: REMOTE + "/test_transport.html",
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
    }, {
        name: "test easyXDM.Socket{NixMessageTransport}",
        runIf: function(){
            if (!("ActiveXObject" in window && (/msie [67]/i).test(navigator.userAgent))) {
                return "This test requires IE6/7";
            }
        },
        
        setUp: function(){
            this.expectedMessage = "3abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                var messages = 0;
                this.transport = new easyXDM.Socket({
                    protocol: "3",
                    local: "../name.html",
                    remote: REMOTE + "/test_transport.html",
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
    }, {
        name: "test easyXDM.Socket{NameTransport}",
        failedMessage: "This might fail in modern browsers due to restrictions in referencing existing windows",
        setUp: function(){
            this.expectedMessage = "1abcd1234";
        },
        tearDown: function(){
            this.transport.destroy();
            if (document.getElementsByTagName("iframe").length !== 0) {
                throw new Error("iframe still present");
            }
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                var messages = 0;
                this.transport = new easyXDM.Socket({
                    protocol: "2", // This is just to override the automatic selection
                    local: "../name.html",
                    remote: REMOTE + "/test_transport.html",
                    remoteHelper: REMOTE + "/../name.html",
                    onMessage: function(message, origin){
                        if (scope.expectedMessage === message) {
                            if (++messages === 2) {
                                scope.notifyResult(true);
                            }
                        }
                    },
                    container: document.getElementById("embedded"),
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
        }]
    }, {
        name: "test easyXDM.Socket{HashTransport} using window",
        setUp: function(){
            this.expectedMessage = "1abcd1234";
        },
        tearDown: function(){
            this.transport.destroy();
            if (document.getElementsByTagName("iframe").length !== 0) {
                throw new Error("iframe still present");
            }
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                var messages = 0;
                this.transport = new easyXDM.Socket({
                    protocol: "0", // This is just to override the automatic selection
                    local: window,
                    remote: REMOTE + "/test_transport.html",
                    onMessage: function(message, origin){
                        if (scope.expectedMessage === message) {
                            if (++messages === 2) {
                                scope.notifyResult(true);
                            }
                        }
                    },
                    container: document.getElementById("embedded"),
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
        }]
    }, {
        name: "test easyXDM.Socket{HashTransport} with no blank local, available image and resize",
        failedMessage: "This might fail in modern browsers due to restrictions in referencing existing windows",
        setUp: function(){
            this.expectedMessage = "2abcd1234";
            this.img = document.createElement("img");
            this.img.src = "s.gif";
            document.body.appendChild(this.img);
        },
        tearDown: function(){
            document.body.removeChild(this.img);
            this.transport.destroy();
            if (document.getElementsByTagName("iframe").length !== 0) {
                throw new Error("iframe still present");
            }
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                var messages = 0;
                this.transport = new easyXDM.Socket({
                    protocol: "0", // This is just to override the automatic selection
                    remote: REMOTE + "/test_transport.html",
                    onMessage: function(message, origin){
                        if (++messages === 2) {
                            scope.notifyResult(true);
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
        }]
    }, {
        name: "test easyXDM.Socket{HashTransport} with s.gif and polling",
        failedMessage: "This might fail in modern browsers due to restrictions in referencing existing windows",
        setUp: function(){
            this.expectedMessage = "2abcd1234";
        },
        tearDown: function(){
            this.transport.destroy();
            if (document.getElementsByTagName("iframe").length !== 0) {
                throw new Error("iframe still present");
            }
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                var messages = 0;
                this.transport = new easyXDM.Socket({
                    protocol: "0", // This is just to override the automatic selection
                    local: "s.gif",
                    remote: REMOTE + "/test_transport.html",
                    onMessage: function(message, origin){
                        if (++messages === 2) {
                            scope.notifyResult(true);
                        }
                    },
                    container: document.getElementById("embedded"),
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
        }]
    }, {
        name: "test easyXDM.Socket{HashTransport} with fragmentation (8192)",
        failedMessage: "This might fail in modern browsers due to restrictions in referencing existing windows",
        setUp: function(){
            var i = 11;
            this.expectedMessage = "aaaa";
            while (i--) {
                this.expectedMessage += this.expectedMessage;
            }
        },
        tearDown: function(){
            this.transport.destroy();
            if (document.getElementsByTagName("iframe").length !== 0) {
                throw new Error("iframe still present");
            }
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                this.transport = new easyXDM.Socket({
                    protocol: "0", // This is just to override the automatic selection
                    local: "../name.html",
                    remote: REMOTE + "/test_transport.html",
                    onMessage: function(message, origin){
                        scope.notifyResult(scope.expectedMessage === message);
                    },
                    container: document.getElementById("embedded"),
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
            }
        }]
    }, {
        name: "test easyXDM.Socket{}",
        setUp: function(){
            this.expectedMessage = "4abcd1234";
        },
        tearDown: function(){
            this.transport.destroy();
            if (document.getElementsByTagName("iframe").length !== 0) {
                throw new Error("iframe still present");
            }
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                this.transport = new easyXDM.Socket({
                    local: "../name.html",
                    remote: REMOTE + "/test_transport.html",
                    onMessage: function(message, origin){
                        scope.notifyResult((scope.expectedMessage === message));
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
            }
        }]
    }, {
        name: "test easyXDM.Socket{} with buffering",
        setUp: function(){
            this.expectedMessage = "4abcd1234";
        },
        tearDown: function(){
            this.transport.destroy();
            if (document.getElementsByTagName("iframe").length !== 0) {
                throw new Error("iframe still present");
            }
        },
        steps: [{
            name: "onReady is fired, and buffered message sent",
            timeout: 5000,
            run: function(){
                var scope = this;
                this.transport = new easyXDM.Socket({
                    local: "../name.html",
                    remote: REMOTE + "/test_transport.html",
                    onMessage: function(message, origin){
                        scope.notifyResult((scope.expectedMessage === message));
                    },
                    onReady: function(){
                        scope.notifyResult(true);
                    }
                });
                this.transport.postMessage(this.expectedMessage);
            }
        }]
    }, {
        name: "test easyXDM.Socket{} with query parameters",
        setUp: function(){
            this.expectedMessage = "5abcd1234";
        },
        tearDown: function(){
            this.transport.destroy();
            if (document.getElementsByTagName("iframe").length !== 0) {
                throw new Error("iframe still present");
            }
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                this.transport = new easyXDM.Socket({
                    local: "../name.html",
                    remote: REMOTE + "/test_transport.html?a=b&c=d",
                    onMessage: function(message, origin){
                        scope.notifyResult((scope.expectedMessage === message));
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
            }
        }]
    }, {
        name: "test easyXDM.Rpc",
        setUp: function(){
            this.expectedMessage = "6abcd1234";
        },
        tearDown: function(){
            this.remote.destroy();
            if (document.getElementsByTagName("iframe").length !== 0) {
                throw new Error("iframe still present");
            }
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                this.remote = new easyXDM.Rpc({
                    local: "../name.html",
                    remote: REMOTE + "/test_rpc.html",
                    remoteHelper: REMOTE + "/../name.html",
                    container: document.getElementById("embedded"),
                    onReady: function(){
                        scope.notifyResult(true);
                    }
                }, {
                    remote: {
                        voidMethod: {},
                        asyncMethod: {},
                        method: {},
                        error: {},
                        nonexistent: {}
                    },
                    local: {
                        voidCallback: {
                            method: function(message){
                                scope.notifyResult((scope.expectedMessage === message));
                            }
                        }
                    }
                });
            }
        }, {
            name: "void method",
            timeout: 5000,
            run: function(){
                this.remote.voidMethod(this.expectedMessage);
            }
        }, {
            name: "async method",
            timeout: 5000,
            run: function(){
                var scope = this;
                this.remote.asyncMethod(this.expectedMessage, function(message){
                    scope.notifyResult((scope.expectedMessage === message));
                });
            }
        }, {
            name: "regular method",
            timeout: 5000,
            run: function(){
                var scope = this;
                this.remote.method(this.expectedMessage, function(message){
                    scope.notifyResult((scope.expectedMessage === message));
                });
            }
        }, {
            name: "with error",
            timeout: 5000,
            run: function(){
                var scope = this;
                this.remote.error(this.expectedMessage, function(){
                    this.notifyResult(false, "success handler called");
                }, function(message){
                    scope.notifyResult(true);
                });
            }
        }, {
            name: "calling nonexistent method",
            timeout: 5000,
            run: function(){
                var scope = this;
                this.remote.nonexistent(this.expectedMessage, function(){
                    this.notifyResult(false, "success handler called");
                }, function(message){
                    scope.notifyResult(true);
                });
            }
        }]
    }]);
}
