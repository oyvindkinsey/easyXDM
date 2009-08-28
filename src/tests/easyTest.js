var easyTest = (function(){
    var _messages;
    var _tests, _steps;
    var _testIndex, _stepIndex;
    var _start, _timer;
    var _scope;
    var _finishStep;
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
        var el = document.createElement("div");
        el.innerHTML = msg;
        switch (type) {
            case MessageType.Error:
                el.className = "easyTest_error";
                break;
            case MessageType.Success:
                el.className = "easyTest_success";
                break;
            default:
                el.className = "easyTest_msg";
        }
        _messages.appendChild(el);
    }
    
    /**
     * Used to notify the framework of the result of the test
     * @param {String} name The name of the test
     * @param {Boolean} result The result of the test
     * @param {String} reason An optional reason why the test returned the result
     */
    function _notifyResult(name, result, reason){
        if (result) {
            _log(name + " succeded! " + (reason || ""), MessageType.Success);
        }
        else {
            _log(name + " failed! " + (reason || ""), MessageType.Error);
        }
        _finishStep();
    }
    
    /**
     * Runs through the test step
     * @param {Object} step The step to run
     */
    function _runStep(step){
        _scope.stepName = step.name;
        
        if (step.timeout) {
            _timer = window.setTimeout(function(){
                _notifyResult(step.name, false, "Failed due to timeout.");
            }, step.timeout);
            try {
                step.run.call(_scope);
            } 
            catch (ex) {
				window.clearTimeout(_timer);
                _notifyResult(step.name, false, ex.message);
            }
        }
        else {
            try {
                _notifyResult(step.name, step.run.call(_scope));
            } 
            catch (ex) {
                _notifyResult(step.name, false, "'" + ex.message + "' at line " + ex.lineNumber);
            }
        }
    }
    
    /**
     * Runs  the test
     * @param {Object} test The test to run
     */
    function _runTest(test){
        _scope = {
            startedAt: new Date(),
            notifyResult: function(result){
                window.clearTimeout(_timer);
                _notifyResult(this.stepName, result);
            }
        };
        
        _log("running test " + _testIndex + ", '" + test.name + "'");
        
        if (test.setup) {
            try {
                test.setup.call(_scope);
            } 
            catch (ex) {
                _notifyResult(test.name, false, ex.message);
            }
        }
        if (test.run) {
            _steps = [];
            _stepIndex = 0;
            try {
                _notifyResult(test.name, test.run());
            } 
            catch (ex) {
                _notifyResult(test.name, false, ex.message);
            }
        }
        else {
            _steps = test.steps;
            _stepIndex = 0;
            _runStep(_steps[_stepIndex++]);
        }
    }
    
    /**
     * Starts the next step or test.<br/>
     * Will run the teardown method if it exists.
     */
    _finishStep = function(){
        function tryTeardown(){
            if (_testIndex > 0 && _tests[_testIndex - 1].teardown) {
                _tests[_testIndex - 1].teardown.call(_scope);
            }
        }
        if (_stepIndex === _steps.length) {
            if (_testIndex === _tests.length) {
                tryTeardown();
                _log("testing completed in " + (new Date().valueOf() - _start.valueOf()) + "ms");
            }
            else {
                tryTeardown();
                _runTest(_tests[_testIndex++]);
            }
        }
        else {
            _runStep(_steps[_stepIndex++]);
        }
    };
    
    return {
        /**
         * Runs through all the tests
         * @param {Array} tests The tests to run
         */
        test: function(tests){
            if (!_messages) {
                _messages = document.createElement("div");
                _messages.className = "easyTest_messages";
                document.body.appendChild(_messages);
            }
            else {
                _messages.innerHTML = "";
            }
            _testIndex = 0;
            _tests = tests;
            _start = new Date();
            _runTest(_tests[_testIndex++]);
        }
    };
}());
