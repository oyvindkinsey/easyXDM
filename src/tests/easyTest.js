var easyTest = (function(){
    var _messages;
    var _start;
    var MessageType = {
        Error: 1,
        Success: 2,
        Info: 3
    };
    
    /**
     * Logs the message to the body
     * @param {String} msg The message to displey
     * @param {MessageType} type The messagetype
     */
    function _log(msg, type){
        var el = _messages.appendChild(document.createElement("div"));
        el.innerHTML = msg;
        _messages.scrollTop = _messages.scrollHeight;
        switch (type) {
            case MessageType.Error:
                el.className = "easyTest_error";
                break;
            case MessageType.Success:
                el.className = "easyTest_success";
                break;
            default:
                el.className = "easyTest_msg";
                break;
        }
    }
    
    var Assert = {
        // Type checks
        isTypeOf: function(type, obj){
            return typeof obj === type;
        },
        isInstanceOf: function(type, obj){
            return obj instanceof type;
        },
        isString: function(obj){
            return this.isTypeOf("string", obj);
        },
        isNumber: function(obj){
            return this.isTypeOf("number", obj);
        },
        isObject: function(obj){
            return this.isTypeOf("object", obj);
        },
        isBoolean: function(obj){
            return this.isTypeOf("boolean", obj);
        },
        isFunction: function(obj){
            return this.isTypeOf("function", obj);
        },
        // Equality
        areEqual: function(a, b){
            return a == b;
        },
        areNotEqual: function(a, b){
            return a != b;
        },
        // Identical
        areSame: function(a, b){
            return a === b;
        },
        areNotSame: function(a, b){
            return a !== b;
        }
        
    };
    
    function Test(test, fn){
        var _scope, _steps = test.steps, _step, _stepIndex = 0;
        var _timer, _runStep, _startedAt, _stepStartedAt;
        
        /**
         * Clean up and tear down the test.<br/>
         * Calls back to notify that the test is complete
         */
        function _endTest(){
            // Tear down the test
            if (test.tearDown) {
                try {
                    test.tearDown.call(_scope);
                } 
                catch (ex) {
                    _log("Teardown '" + ex.message + "(" + ex.fileName + ", " + ex.lineNumber + ")" + "'", MessageType.Error);
                }
            }
            for (var key in _scope) {
                if (_scope.hasOwnProperty(key)) {
                    delete _scope[key];
                }
            }
            
            // Call back
            fn();
        }
        
        /**
         * Used to notify the framework of the result of the test
         * @param {String} name The name of the test
         * @param {Boolean} result The result of the test
         * @param {String} reason An optional reason why the test returned the result
         */
        function _notifyResult(name, result, reason){
            var now = new Date().getTime();
            var testsetTime = now - _start.getTime();
            var testTime = now - _startedAt.getTime();
            var stepTime = now - _stepStartedAt.getTime();
            
            var times = testsetTime + "ms, " + testTime + "ms, " + stepTime + "ms - ";
            if (result) {
                _log(times + name + " succeeded! " + (reason || ""), MessageType.Success);
            }
            else {
                _log(times + name + " failed! " + (reason || ""), MessageType.Error);
                if (test.failedMessage) {
                    _log(test.failedMessage, MessageType.Info);
                }
            }
            // Go to next step
            if (result) {
                _stepIndex++;
                window.setTimeout(function(){
                    _runStep();
                }, 0);
            }
            else {
                _endTest();
            }
        }
        
        
        /**
         * Runs through the test step
         */
        _runStep = function(){
            if (_stepIndex < _steps.length) {
                // We still have steps to run
                _step = _steps[_stepIndex];
                _stepStartedAt = new Date();
                if (_step.timeout) {
                    // This an asynchronous test
                    _timer = window.setTimeout(function(){
                        _notifyResult(_step.name, false, "Failed due to timeout.");
                    }, _step.timeout);
                    try {
                        _step.run.call(_scope);
                    } 
                    catch (ex) {
                        //If it fails we cancel the timeout
                        window.clearTimeout(_timer);
                        _notifyResult(_step.name, false, "'" + ex.message + "(" + ex.fileName + ", " + ex.lineNumber + ")" + "'");
                    }
                }
                else {
                    // This is a synchronous test
                    try {
                        var result = _step.run.call(_scope);
                        _notifyResult(_step.name, result);
                    } 
                    catch (ex) {
                        _notifyResult(_step.name, false, "'" + ex.message + "(" + ex.fileName + ", " + ex.lineNumber + ")" + "'");
                    }
                }
            }
            else {
                _endTest();
            }
        };
        
        return {
            /**
             * Runs the test.
             * Will first try to execute the setup method before continuing the steps
             */
            run: function(){
                var excuse;
                if (test.runIf) {
                    excuse = test.runIf();
                }
                if (excuse) {
                    _log("Skipping test ' " + test.name + "'. " + excuse);
                    fn();
                }
                else {
                    _log("Running test '" + test.name + "'");
                    _scope = {
                        Assert: Assert,
                        log: _log,
                        notifyResult: function(result){
                            window.clearTimeout(_timer);
                            _notifyResult(_step.name, result);
                        }
                    };
                    if (test.setUp) {
                        // Setup the test
                        try {
                            test.setUp.call(_scope);
                            _log("Setup succeeded", MessageType.Success);
                        } 
                        catch (ex) {
                            _log("Setup failed", MessageType.Error);
                        }
                    }
                    _startedAt = new Date();
                    _runStep();
                }
            }
        };
    }
    
    return {
        /**
         * Runs through all the tests
         * @param {Array} tests The tests to run
         */
        test: function(testset){
            var tests = [], testConfig, i = testset.length, test;
            
            // Prepare the messaging facilities
            if (!_messages) {
                _messages = document.createElement("div");
                _messages.className = "easyTest_messages";
                (document.getElementById("messages") || document.body).appendChild(_messages);
            }
            else {
                _messages.innerHTML = "";
            }
            
            // Convert the testset
            while (i--) {
                testConfig = testset[i];
                if (!testConfig.steps) {
                    // Convert a single step test to a proper test
                    testConfig = {
                        steps: testConfig
                    };
                }
                
                tests.push(new Test(testConfig, function(){
                    // Get the next test to run
                    test = tests.pop();
                    if (test) {
                        // This is needed to avoid a strange bug in Opera,
                        window.setTimeout(function(){
                            test.run();
                        }, 0);
                    }
                    else {
                        // No more tests to run
                        _log("Test run complete", MessageType.Info);
                    }
                }));
            }
            // Start the first test
            _start = new Date();
            tests.pop().run();
        }
    };
}());
