// #ifdef debug
easyXDM.configuration = {

    /**
     * @class easyXDM.configuration.TransportConfiguration
     * The configuration for transport classes.
     * @namespace easyXDM.configuration
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
     * @class easyXDM.configuration.ChannelConfiguration
     * The channels configuration
     * @extends easyXDM.configuration.TransportConfiguration
     * @namespace easyXDM.configuration
     */
    ChannelConfiguration: {
        /**
         * The serializer to use
         * @type easyXDM.serializing.ISerializer
         */
        converter: {}
    },
    /**
     * @class easyXDM.configuration.InterfaceConfiguration
     * The interface configuration
     * @namespace easyXDM.configuration
     */
    InterfaceConfiguration: {
        /**
         * The local property is of type {@link easyXDM.configuration.LocalConfiguration}
         * @link {easyXDM.configuration.LocalConfiguration}
         * @type easyXDM.configuration.LocalConfiguration
         */
        local: {},
        /**
         * The remote property contains a list of method-definitions in the form of methodname:{description}
         * @type easyXDM.configuration.RemoteConfiguration
         */
        remote: {}
    },
    /**
     * @class easyXDM.configuration.LocalConfiguration
     * The configuration for the local property
     * @namespace easyXDM.configuration
     */
    LocalConfiguration: {
        /**
         * A method returning data
         * @type easyXDM.configuration.Methods.LocalMethod
         */
        methodName: {},
        /**
         * A method not returning any data
         * @type easyXDM.configuration.Methods.LocalVoidMethod
         */
        voidMethodName: {},
        /**
         * An asynchronous method that is unable to return data immediately
         * This can for instance be a method using an xmlHttpRequest object to retrieve data
         * @type easyXDM.configuration.Methods.LocalAsyncMethod
         */
        asyncMethodName: {}
    },
    /**
     * @class easyXDM.configuration.RemoteConfiguration
     * The configuration for the remote property
     * @namespace easyXDM.configuration
     */
    RemoteConfiguration: {
        /**
         * Methods are by default expected to return data
         * @type easyXDM.configuration.Methods.RemoteMethod
         */
        methodName: {},
        /**
         * We do not expect any data back from this method
         * @type easyXDM.configuration.Methods.RemoteVoidMethod
         */
        voidMethodName: {},
        /**
         * We do not need to know that the remote method is implemented asynchronous
         * @type easyXDM.configuration.Methods.RemoteAsyncMethod
         */
        asyncMethodName: {}
    },
    /**
     * Contains description on the various method descriptions
     */
    Methods: {
        /**
         * @class easyXDM.configuration.Methods.Method
         * The base method implementation
         * @namespace easyXDM.configuration.Methods
         */
        Method: {},
        /**
         * @class easyXDM.configuration.Methods.LocalMethod
         * @extends easyXDM.configuration.Methods.Method
         * A method returning data
         * @namespace easyXDM.configuration.Methods
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
         * @class easyXDM.configuration.Methods.LocalVoidMethod
         * @extends easyXDM.configuration.Methods.Method
         * A method not returning any data
         * @namespace easyXDM.configuration.Methods
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
         * @class easyXDM.configuration.Methods.LocalAsyncMethod
         * @extends easyXDM.configuration.Methods.Method
         * An asynchronous method that is unable to return data immediately
         * This can for instance be a method using an xmlHttpRequest object to retrieve data
         * @namespace easyXDM.configuration.Methods
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
         * @class easyXDM.configuration.Methods.RemoteMethod
         * Methods are by default expected to return data
         * @namespace easyXDM.configuration.Methods
         */
        RemoteMethod: {},
        /**
         * @class easyXDM.configuration.Methods.RemoteVoidMethod
         * @extends easyXDM.configuration.Methods.Method
         * We do not expect any data back from this method
         * @namespace easyXDM.configuration.Methods
         */
        RemoteVoidMethod: {
            /**
             * We mark the method as void so that the framework will not wait for any response, and will not expect a callback method
             */
            isVoid: true
        },
        /**
         * @class easyXDM.configuration.Methods.RemoteAsyncMethod
         * @extends easyXDM.configuration.Methods.Method
         * We do not need to know that the remote method is implemented asynchronous
         * @namespace easyXDM.configuration.Methods
         */
        RemoteAsyncMethod: {}
    }
};
// #endif
