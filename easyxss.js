/*
Copyright (c) <2009> <Øyvind Sean Kinsey, oyvind@kinsey.no>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
var EasyXSS = {
    converters: {
        hashTableConverter: {
            convertToString: function(data){
                var message = "";
                for (key in data) {
                    message += key + "=" + data[key] + "&";
                }
                return message.substring(0, message.length - 1);
            },
            convertFromString: function(message){
                var data = {};
                var d = message.split("&");
                var pair, key, value;
                for (var i = 0, len = d.length; i < len; i++) {
                    pair = d[i];
                    key = pair.substring(0, pair.indexOf("="));
                    value = pair.substring(key.length + 1);
                    data[key] = value;
                    
                }
                return data;
            }
        }
    },
    Query: function(){
        var search = location.search.substring(1).split("&");
        var hash = {};
        var pair, key, value;
        for (var i = 0, len = search.length; i < len; i++) {
            pair = search[i];
            key = pair.substring(0, pair.indexOf("="));
            value = pair.substring(key.length + 1);
            hash[key] = value;
        }
        return hash;
    },
    getDomainName: function(endpoint){
        endpoint = endpoint.substring(endpoint.indexOf("//") + 2);
        endpoint = endpoint.substring(0, endpoint.indexOf("/"));
        var _indexOf = endpoint.indexOf(":");
        if (_indexOf != -1) {
            endpoint = endpoint.substring(0, _indexOf);
        }
        return endpoint;
    },
    getLocation: function(endpoint){
        var indexOf = endpoint.indexOf("//");
        var loc = endpoint.substring(indexOf + 2);
        loc = loc.substring(0, loc.indexOf("/"));
        return endpoint.substring(0, indexOf + 2) + loc;
    },
    
    createFrame: function(url, name, onLoad){
        var frame;
        if (name && window.attachEvent) {
            var span = document.createElement("span");
            document.body.appendChild(span);
            span.innerHTML = '<iframe src="' + url + '#start" id="' + name + '" name="' + name + '"></iframe>';
            frame = document.getElementById(name);
            if (onLoad) {
                this.addEventListener(frame, "load", function(){
                    onLoad(frame.contentWindow);
                })
            }
        }
        else {
            frame = document.createElement("IFRAME");
            frame.style.position = "absolute";
            frame.style.left = "-2000px";
            frame.name = name;
            frame.id = name;
            frame.src = url + "#start";
            if (onLoad) {
                this.addEventListener(frame, "load", function(){
                    onLoad(frame.contentWindow);
                })
            }
            document.body.appendChild(frame);
        }
        return frame;
    },
    addEventListener: function(element, event, handler){
        if (window.addEventListener) {
            element.addEventListener(event, handler, false);
        }
        else {
            element.attachEvent("on" + event, handler);
        }
    },
    removeEventListener: function(element, event, handler){
        if (window.removeEventListener) {
            element.removeEventListener(event, handler, false);
        }
        else {
            element.detachEvent("on" + event, handler);
        }
    },
    createTransport: function(config){
        if (!config.local) {
            var query = this.Query();
            config.channel = query["channel"];
            config.remote = query["endpoint"];
        }
        if (window.postMessage || window.document.postMessage) {
            return this.createHashTransport(config);
            return this.createPostMessageTransport(config);
        }
        else {
            return this.createHashTransport(config);
        }
    },
    createProxy: function(config){
        config.onMessage = (config.converter) ? (function(message, origin){
            this.onData(this.converter.convertFromString(message), origin);
        }) : config.Data;
        var transport = this.createTransport(config);
        return {
            transport: transport,
            sendData: function(data){
                var message = (config.converter) ? config.converter.convertToString(data) : data;
                this.transport.postMessage(message);
            },
            start: transport.start,
            stop: transport.stop
        };
    },
    createPostMessageTransport: function(config){
        var xss = this;
        var _targetOrigin = this.getLocation(config.remote);
        var _listening;
        var _windowPostMessage;
        var _isStarted, _isReady;
        
        function _postMessage(message){
            _windowPostMessage(message, _targetOrigin);
        }
        
        function _getOrigin(event){
            if (event.origin) {
                return event.origin;
            }
            if (event.uri) {
                return xss.getLocation(event.uri)
            }
        }
        function _isAllowed(origin){
            return true;
            
            if (origin == _targetOrigin) {
            }
            else {
                alert("'" + origin + "'!='" + _targetOrigin + "' - " + event.data);
            }
        }
        function _window_onMessage(event){
            var origin = _getOrigin(event);
            if (_isAllowed(origin)) {
                config.onMessage(event.data, origin);
            }
        }
        
        if (config.local) {
            _listeningWindow = xss.createFrame(config.remote + "?endpoint=" + config.local + "&channel=" + config.channel, "", function(win){
                _windowPostMessage = win.postMessage;
                if (config.onReady) {
                    config.onReady();
                }
            });
        }
        else {
            _windowPostMessage = window.parent.postMessage;
            if (config.onReady) {
                config.onReady();
            }
        }
        xss.addEventListener(window, "message", _window_onMessage);
        return {
            postMessage: _postMessage,
            start: function(){
            },
            stop: function(){
                if (_listening) {
                    _detach();
                }
            }
        };
    },
    createHashTransport: function(config){
        var MESSAGE_SEPARATOR = "§";
        var _timer = null;
        var _lastMsg = "#start", _msgNr = 0;
        var _listenerWindow, _callerWindow;
        var _remoteUrl = config.remote + ((config.local) ? "?endpoint=" + config.local + "&channel=" + config.channel : "");
        var _remoteOrigin = this.getLocation(config.remote);
        var _pollInterval = (config.interval) ? config.interval : 300;
        
        function _getMessage(){
            if (!_listenerWindow) {
                _listenerWindow = (navigator.userAgent.indexOf("Safari") != -1) ? frames["xss_" + config.channel] : window.open(config.local + "#start", "xss_" + config.channel);
            }
            try {
                if (_listenerWindow.location.hash != _lastMsg) {
                    _lastMsg = _listenerWindow.location.hash
                    var message = _lastMsg.substring(_lastMsg.indexOf(MESSAGE_SEPARATOR) + MESSAGE_SEPARATOR.length);
                    config.onMessage(decodeURIComponent(message), _remoteOrigin);
                }
            } 
            catch (ex) {
            }
            
        }
        
        function _postMessage(message){
            _callerWindow.src = _remoteUrl + "#" + (_msgNr++) + MESSAGE_SEPARATOR + encodeURIComponent(message);
        }
        
        function _startTimer(){
            _timer = window.setInterval(function getMessageTick(){
                _getMessage();
            }, _pollInterval);
        }
        
        function _onReady(){
            if (config.onReady) {
                window.setTimeout(config.onReady, 300);
            }
        }
        
        _callerWindow = this.createFrame(_remoteUrl, ((config.local) ? "" : "xss_" + config.channel), function(){
            if (!config.local) {
                _onReady();
            }
        });
        if (!config.local) {
            _listenerWindow = window;
        }
        return {
            postMessage: _postMessage,
            start: function(){
                _startTimer();
            },
            stop: function(){
                window.clearInterval(_timer);
                _listenerWindow = null;
                _callerWindow.parentNode.removeChild(_callerWindow);
            }
        };
    }
}
