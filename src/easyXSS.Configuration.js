easyXSS.Configuration = {

    /**
     * @class easyXSS.Configuration.TransportConfiguration
     * The configuration for transport classes
     * @namespace easyXSS.Configuration
     */
    TransportConfiguration: {
        /**
         * The url of the remote endpoint
         */
        remote: "",
        /**
         * The url of the local copy of hash.html
         */
        local: "",
        /**
         * The method that should handle incoming messages
         * @param {String} message The message
         * @param {String} origin The origin of the message
         */
        onMessage: function(message, origin){
        
        }
    },
    
    /**
     * @class easyXSS.Configuration.ChannelConfiguration
     * The channels configuration
     * @extends easyXSS.Configuration.TransportConfiguration
     * @namespace easyXSS.Configuration
     */
    ChannelConfiguration: {
        /**
         * The serializer to use
         * @type easyXSS.Serializing.ISerializer
         */
        converter: {}
    },
    /**
     * @class easyXSS.Configuration.InterfaceConfiguration
     * The interface configuration
     * @namespace easyXSS.Configuration
     */
    InterfaceConfiguration: {
        /**
         * The local property is of type {@link easyXSS.Configuration.LocalConfiguration}
         * @link {easyXSS.Configuration.LocalConfiguration}
         * @type easyXSS.Configuration.LocalConfiguration
         */
        local: {},
        /**
         * The remote property contains a list of method-definitions in the form of methodname:{description}
         * @type easyXSS.Configuration.RemoteConfiguration
         */
        remote: {}
    },
    /**
     * @class easyXSS.Configuration.LocalConfiguration
     * The configuration for the local property
     * @namespace easyXSS.Configuration
     */
    LocalConfiguration: {
        /**
         * A method returning data
         * @type easyXSS.Configuration.Methods.LocalMethod
         */
        methodName: {},
        /**
         * A method not returning any data
         * @type easyXSS.Configuration.Methods.LocalVoidMethod
         */
        voidMethodName: {},
        /**
         * An asynchronous method that is unable to return data immediately
         * This can for instance be a method using an xmlHttpRequest object to retrieve data
         * @type easyXSS.Configuration.Methods.LocalAsyncMethod
         */
        asyncMethodName: {}
    },
    /**
     * @class easyXSS.Configuration.RemoteConfiguration
     * The configuration for the remote property
     * @namespace easyXSS.Configuration
     */
    RemoteConfiguration: {
        /**
         * Methods are by default expected to return data
         * @type easyXSS.Configuration.Methods.RemoteMethod
         */
        methodName: {},
        /**
         * We do not expect any data back from this method
         * @type easyXSS.Configuration.Methods.RemoteVoidMethod
         */
        voidMethodName: {},
        /**
         * We do not need to know that the remote method is implemented asynchronous
         * @type easyXSS.Configuration.Methods.RemoteAsyncMethod
         */
        asyncMethodName: {}
    },
    /**
     * Contains description on the various method descriptions
     */
    Methods: {
        /**
         * @class easyXSS.Configuration.Methods.LocalMethod
         * A method returning data
         * @namespace easyXSS.Configuration.Methods
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
         * @class easyXSS.Configuration.Methods.LocalVoidMethod
         * A method not returning any data
         * @namespace easyXSS.Configuration.Methods
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
         * @class easyXSS.Configuration.Methods.LocalAsyncMethod
         * An asynchronous method that is unable to return data immediately
         * This can for instance be a method using an xmlHttpRequest object to retrieve data
         * @namespace easyXSS.Configuration.Methods
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
         * @class easyXSS.Configuration.Methods.RemoteMethod
         * Methods are by default expected to return data
         * @namespace easyXSS.Configuration.Methods
         */
        RemoteMethod: {},
        /**
         * @class easyXSS.Configuration.Methods.RemoteVoidMethod
         * We do not expect any data back from this method
         * @namespace easyXSS.Configuration.Methods
         */
        RemoteVoidMethod: {
            /**
             * We mark the method as void so that the framework will not wait for any response, and will not expect a callback method
             */
            isVoid: true
        },
        /**
         * @class easyXSS.Configuration.Methods.RemoteAsyncMethod
         * We do not need to know that the remote method is implemented asynchronous
         * @namespace easyXSS.Configuration.Methods
         */
        RemoteAsyncMethod: {}
    }
};
