/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyTest, easyXDM, window*/
var _remoteUrl = location.href.substring(0, location.href.lastIndexOf("/") + 1);
if (_remoteUrl.indexOf("easyxdm.net") !== -1) {
    _remoteUrl = _remoteUrl.replace("easyxdm.net", "provider.easyxdm.net");
}
if (_remoteUrl.indexOf("xdm1") !== -1) {
    _remoteUrl = _remoteUrl.replace("xdm1", "xdm2");
}
var channelId = 0;
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
            name: "check for the presence of easyXDM.Debug",
            run: function(){
                return this.Assert.isObject(easyXDM.Debug);
            }
        }, {
            name: "check for the presence of easyXDM.configuration",
            run: function(){
                return this.Assert.isObject(easyXDM.configuration);
            }
        }, {
            name: "check for the presence of easyXDM.DomHelper",
            run: function(){
                return this.Assert.isObject(easyXDM.DomHelper);
            }
        }, {
            name: "check for the presence of easyXDM.Url",
            run: function(){
                return this.Assert.isObject(easyXDM.Url);
            }
        }, {
            name: "check for the presence of easyXDM.Transport",
            run: function(){
                return this.Assert.isFunction(easyXDM.Transport);
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
        name: "test easyXDM.Transport{PostMessageTransport}",
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
                this.transport = new easyXDM.Transport({
                    protocol: "1",
                    channel: "channel" + (channelId++),
                    local: "../hash.html",
                    remote: _remoteUrl + "test_transport.html",
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
        name: "test easyXDM.Transport{NameTransport} using queuing",
        runIf: function(){
            if (typeof window.postMessage !== "undefined") {
                return "This test will often fail in modern browser due to window.open() not always returning existing windows";
            }
        },
        setUp: function(){
            this.expectedMessage = "1abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                var messages = 0;
                this.transport = new easyXDM.Transport({
                    protocol: "2",
                    channel: "channel" + (channelId++),
                    local: "../hash.html",
                    remote: _remoteUrl + "test_transport.html",
                    remoteHelper: _remoteUrl + "../hash.html",
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
        }, {
            name: "destroy",
            run: function(){
                this.transport.destroy();
                return ((document.getElementsByTagName("iframe").length === 0));
            }
        }]
    }, {
        name: "test easyXDM.Transport{HashTransport} using polling and queuing",
        setUp: function(){
            this.expectedMessage = "1abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                var messages = 0;
                this.transport = new easyXDM.Transport({
                    protocol: "0",
                    channel: "channel" + (channelId++),
                    local: "../hash.html",
                    remote: _remoteUrl + "test_transport.html",
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
        }, {
            name: "destroy",
            run: function(){
                this.transport.destroy();
                return ((document.getElementsByTagName("iframe").length === 0));
            }
        }]
    }, {
        name: "test easyXDM.Transport{HashTransport} using onresize and queuing",
        setUp: function(){
            this.expectedMessage = "2abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                var messages = 0;
                this.transport = new easyXDM.Transport({
                    protocol: "0",
                    channel: "channel" + (channelId++),
                    local: "../hash.html",
                    remote: _remoteUrl + "test_transport.html",
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
        name: "test easyXDM.Transport{HashTransport} using parent and queuing",
        setUp: function(){
            this.expectedMessage = "2abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                var messages = 0;
                this.transport = new easyXDM.Transport({
                    protocol: "0",
                    channel: "channel" + (channelId++),
                    local: window,
                    remote: _remoteUrl + "test_transport.html",
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
        name: "test easyXDM.Transport{HashTransport} using readyAfter and queuing",
        runIf: function(){
            if (typeof window.postMessage !== "undefined") {
                return "This test will often fail in modern browser due to window.open() not always returning existing windows";
            }
        },
        setUp: function(){
            this.expectedMessage = "2abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                var messages = 0;
                this.transport = new easyXDM.Transport({
                    protocol: "0",
                    channel: "channel" + (channelId++),
                    readyAfter: 1000,
                    local: "../changes.txt",
                    remote: _remoteUrl + "test_transport.html",
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
        }, {
            name: "destroy",
            run: function(){
                this.transport.destroy();
                return ((document.getElementsByTagName("iframe").length === 0));
            }
        }]
    }, {
        name: "test easyXDM.Transport{HashTransport} with fragmentation (8192)",
        setUp: function(){
            var i = 11;
            this.expectedMessage = "aaaa";
            while (i--) {
                this.expectedMessage += this.expectedMessage;
            }
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                this.transport = new easyXDM.Transport({
                    protocol: "0",
                    channel: "channel" + (channelId++),
                    local: "../hash.html",
                    remote: _remoteUrl + "test_transport.html",
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
        }, {
            name: "destroy",
            run: function(){
                this.transport.destroy();
                return ((document.getElementsByTagName("iframe").length === 0));
            }
        }]
    }, {
        name: "test easyXDM.Transport{}",
        setUp: function(){
            this.expectedMessage = "4abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                this.transport = new easyXDM.Transport({
                    channel: "channel" + (channelId++),
                    local: "../hash.html",
                    remote: _remoteUrl + "test_transport.html",
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
        }, {
            name: "destroy",
            run: function(){
                this.transport.destroy();
                return ((document.getElementsByTagName("iframe").length === 0));
            }
        }]
    }, {
        name: "test easyXDM.Transport{} with query parameters",
        setUp: function(){
            this.expectedMessage = "5abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                this.transport = new easyXDM.Transport({
                    channel: "channel" + (channelId++),
                    local: "../hash.html",
                    remote: _remoteUrl + "test_transport.html?a=b&c=d",
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
        }, {
            name: "destroy",
            run: function(){
                this.transport.destroy();
                return ((document.getElementsByTagName("iframe").length === 0));
            }
        }]
    }, {
        name: "test easyXDM.Rpc",
        setUp: function(){
            this.expectedMessage = "6abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                var scope = this;
                this.remote = new easyXDM.Rpc({
                    channel: "channel" + (channelId++),
                    local: "../hash.html",
                    remote: _remoteUrl + "test_rpc.html",
                    remoteHelper: _remoteUrl + "../hash.html",
                    container: document.getElementById("embedded"),
                    onReady: function(){
                        scope.notifyResult(true);
                    }
                }, {
                    remote: {
                        voidMethod: {
                            isVoid: true
                        },
                        asyncMethod: {},
                        method: {}
                    },
                    local: {
                        voidCallback: {
                            method: function(message){
                                scope.notifyResult((scope.expectedMessage === message));
                            },
                            isVoid: true
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
            name: "destroy",
            run: function(){
                this.remote.destroy();
                return ((document.getElementsByTagName("iframe").length === 0));
            }
        }]
    }]);
}
