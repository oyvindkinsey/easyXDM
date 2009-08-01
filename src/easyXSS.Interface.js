/**
 * Contains classes related to the interface implementation
 * @namespace
 */
easyXSS.Interface = {

    /**
     * The interface configuration
     * @class
     */
    InterfaceConfiguration: {
        /**
         * The local property contains a list of method-definitions in the form of methodname:{implementation}
         * @type easyXSS.Interface.LocalConfiguration
         */
        local: {},
        /**
         * The remote property contains a list of method-definitions in the form of methodname:{description}
         * @type easyXSS.Interface.RemoteConfiguration
         */
        remote: {}
    },
    /**
     * The configuration for the local property
     * @class
     */
    LocalConfiguration: {
        /**
         * A method returning data
         * @type easyXSS.Interface.Methods.LocalMethod
         */
        methodName: {},
        /**
         * A method not returning any data
         * @type easyXSS.Interface.Methods.LocalVoidMethod
         */
        voidMethodName: {},
        /**
         * An asynchronous method that is unable to return data immediately
         * This can for instance be a method using an xmlHttpRequest object to retrieve data
         * @type easyXSS.Interface.Methods.LocalAsyncMethod
         */
        asyncMethodName: {}
    },
    /**
     * The configuration for the remote property
     * @class
     */
    RemoteConfiguration: {
        /**
         * Methods are by default expected to return data
         * @type easyXSS.Interface.Methods.RemoteMethod
         */
        methodName: {},
        /**
         * We do not expect any data back from this method
         * @type easyXSS.Interface.Methods.RemoteVoidMethod
         */
        voidMethodName: {},
        /**
         * We do not need to know that the remote method is implemented asynchronous
         * @type easyXSS.Interface.Methods.RemoteAsyncMethod
         */
        asyncMethodName: {}
    },
    /**
     * Contains description on the various method descriptions
     * @namespace
     */
    Methods: {
        /**
         * A method returning data
         * @class
         */
        LocalMethod: {
            /**
             * The implementation
             * @param {Object} arg1
             * @param {Object} arg2
             * @param {Object} argN
             * @return The methods return value
             */
            method: function(arg1, arg2, argN){
            }
        },
        /**
         * A method not returning any data
         * @class
         */
        LocalVoidMethod: {
            /**
             * If the method does not return anything then we mark it as void
             * @property
             */
            isVoid: true,
            /**
             * The implementation
             * @param {Object} arg1
             * @param {Object} arg2
             * @param {Object} argN
             */
            method: function(arg1, arg2, argN){
            }
        },
        /**
         * An asynchronous method that is unable to return data immediately
         * This can for instance be a method using an xmlHttpRequest object to retrieve data
         * @class
         */
        LocalAsyncMethod: {
            /**
             * If the method is asyncronous we mark it as async
             * This is so that the framework will know that it expects a callback function
             */
            isAsync: true,
            /**
             * The implementation
             * @param {Object} arg1
             * @param {Object} arg2
             * @param {Object} argN
             * @param {Function} callback
             */
            method: function(arg1, arg2, argN, callback){
            }
        },
		/**
		 * Methods are by default expected to return data
		 * @class
		 */
        RemoteMethod: {},
		/**
		 * We do not expect any data back from this method
		 * @class
		 */
        RemoteVoidMethod: {
            /**
             * We mark the method as void so that the framework will not wait for any response, and will not expect a callback method
             */
            isVoid: true
        },
		/**
		 * We do not need to know that the remote method is implemented asynchronous
		 * @class
		 */
        RemoteAsyncMethod: {}
    }
};
