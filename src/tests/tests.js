
var _remoteUrl = location.href.substring(0, location.href.lastIndexOf("/") + 1);
function runTests(){
    easyTest.test([/**Tests for the presence of namespaces and classes*/{
        name: "Check that the library is complete",
        steps: [{
            name: "check for the presence of easyXDM",
            run: function(){
                return this.Assert.isObject(easyXDM);
            }
        }, {
            name: "check for the presence of easyXDM.transport",
            run: function(){
                return this.Assert.isObject(easyXDM.transport);
            }
        }, {
            name: "check for the presence of easyXDM.serializing",
            run: function(){
                return this.Assert.isObject(easyXDM.serializing);
            }
        }, {
            name: "check for the presence of easyXDM.configuration",
            run: function(){
                return this.Assert.isObject(easyXDM.configuration);
            }
        }, {
            name: "check for the presence of easyXDM.Channel",
            run: function(){
                return this.Assert.isFunction(easyXDM.Channel);
            }
        }, {
            name: "check for the presence of easyXDM.transport.HashTransport",
            run: function(){
                return this.Assert.isFunction(easyXDM.transport.HashTransport);
            }
        }, {
            name: "check for the presence of easyXDM.transport.PostMessageTransport",
            run: function(){
                return this.Assert.isFunction(easyXDM.transport.PostMessageTransport);
            }
        }, {
            name: "check for the presence of easyXDM.Debug",
            run: function(){
                return this.Assert.isObject(easyXDM.Debug);
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
        }]
    }, /** easyXDM.transport.HashTransport*/ {
        name: "test easyXDM.transport.HashTransport using polling",
        setUp: function(){
            this.expectedMessage = "1abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                /** -----------------------------*/
                var scope = this;
                this.transport = new easyXDM.transport.HashTransport({
                    channel: "default1",
                    local: "../hash.html",
                    remote: _remoteUrl + "test_hashtransport.html",
                    onMessage: function(message, origin){
                        scope.notifyResult((scope.expectedMessage === message));
                    },
                    container: document.getElementById("embedded")
                }, function(){
                    scope.notifyResult(true);
                });
                /** -----------------------------*/
            }
        }, {
            name: "message is echoed back",
            timeout: 1000,
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
        name: "test easyXDM.transport.HashTransport using onresize",
        setUp: function(){
            this.expectedMessage = "2abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                /** -----------------------------*/
                var scope = this;
                this.transport = new easyXDM.transport.HashTransport({
                    channel: "default2",
                    local: "../hash.html",
                    remote: _remoteUrl + "test_hashtransport.html",
                    onMessage: function(message, origin){
                        scope.notifyResult(scope.expectedMessage === message);
                    }
                }, function(){
                    scope.notifyResult(true);
                });
                /** -----------------------------*/
            }
        }, {
            name: "message is echoed back",
            timeout: 1000,
            run: function(){
                this.transport.postMessage(this.expectedMessage);
            }
        }, {
            name: "destroy",
            run: function(){
                this.transport.destroy();
                return true;// ((document.getElementsByTagName("iframe").length === 0));
            }
        }]
    }, {
        name: "test easyXDM.transport.PostMessageTransport",
        setUp: function(){
            this.expectedMessage = "3abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                /** -----------------------------*/
                var scope = this;
                this.transport = new easyXDM.transport.PostMessageTransport({
                    channel: "default3",
                    local: "../hash.html",
                    remote: _remoteUrl + "test_postmessagetransport.html",
                    onMessage: function(message, origin){
                        scope.notifyResult((scope.expectedMessage === message));
                    }
                }, function(){
                    scope.notifyResult(true);
                });
                /** -----------------------------*/
            }
        }, {
            name: "message is echoed back",
            timeout: 1000,
            run: function(){
                this.transport.postMessage(this.expectedMessage);
            }
        }, {
            name: "destroy",
            run: function(){
                easyXDM.Debug.trace("##destroy");
                this.transport.destroy();
                return ((document.getElementsByTagName("iframe").length === 0));
            }
        }]
    }, {
        name: "test easyXDM.transport.BestAvailableTransport",
        setUp: function(){
            this.expectedMessage = "4abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                /** -----------------------------*/
                var scope = this;
                this.transport = new easyXDM.transport.BestAvailableTransport({
                    channel: "default4",
                    local: "../hash.html",
                    remote: _remoteUrl + "test_bestavailabletransport.html",
                    onMessage: function(message, origin){
                        scope.notifyResult((scope.expectedMessage === message));
                    }
                }, function(){
                    scope.notifyResult(true);
                });
                /** -----------------------------*/
            }
        }, {
            name: "message is echoed back",
            timeout: 1000,
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
        name: "test easyXDM.transport.BestAvailableTransport with query parameters",
        setUp: function(){
            this.expectedMessage = "5abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                /** -----------------------------*/
                var scope = this;
                this.transport = new easyXDM.transport.BestAvailableTransport({
                    channel: "default5",
                    local: "../hash.html",
                    remote: _remoteUrl + "test_bestavailabletransport.html?a=b&c=d",
                    onMessage: function(message, origin){
                        scope.notifyResult((scope.expectedMessage === message));
                    }
                }, function(){
                    scope.notifyResult(true);
                });
                /** -----------------------------*/
            }
        }, {
            name: "message is echoed back",
            timeout: 1000,
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
    }, /** easyXDM.Interface*/ {
        name: "test easyXDM.Interface",
        setUp: function(){
            this.expectedMessage = "6abcd1234";
        },
        steps: [{
            name: "onReady is fired",
            timeout: 5000,
            run: function(){
                /** -----------------------------*/
                var scope = this;
                this.remote = new easyXDM.Interface({
                    channel: "default6",
                    local: "../hash.html",
                    remote: _remoteUrl + "test_interface.html"
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
                }, function(){
                    scope.notifyResult(true);
                });
                /** -----------------------------*/
            }
        }, {
            name: "void method",
            timeout: 1000,
            run: function(){
                this.remote.voidMethod(this.expectedMessage);
            }
        }, {
            name: "async method",
            timeout: 1000,
            run: function(){
                var scope = this;
                this.remote.asyncMethod(this.expectedMessage, function(message){
                    scope.notifyResult((scope.expectedMessage === message));
                });
            }
        }, {
            name: "regular method",
            timeout: 1000,
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
