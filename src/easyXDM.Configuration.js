// #ifdef debug
easyXDM.Configuration = {

    /**
     * @class easyXDM.Configuration.TransportConfiguration
     * The configuration for transport classes.
     * @namespace easyXDM.Configuration
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
     * @class easyXDM.Configuration.ChannelConfiguration
     * The channels configuration
     * @extends easyXDM.Configuration.TransportConfiguration
     * @namespace easyXDM.Configuration
     */
    ChannelConfiguration: {
        /**
         * The serializer to use
         * @type easyXDM.Serializing.ISerializer
         */
        converter: {}
    },
    /**
     * @class easyXDM.Configuration.InterfaceConfiguration
     * The interface configuration
     * @namespace easyXDM.Configuration
     */
    InterfaceConfiguration: {
        /**
         * The local property is of type {@link easyXDM.Configuration.LocalConfiguration}
         * @link {easyXDM.Configuration.LocalConfiguration}
         * @type easyXDM.Configuration.LocalConfiguration
         */
        local: {},
        /**
         * The remote property contains a list of method-definitions in the form of methodname:{description}
         * @type easyXDM.Configuration.RemoteConfiguration
         */
        remote: {}
    },
    /**
     * @class easyXDM.Configuration.LocalConfiguration
     * The configuration for the local property
     * @namespace easyXDM.Configuration
     */
    LocalConfiguration: {
        /**
         * A method returning data
         * @type easyXDM.Configuration.Methods.LocalMethod
         */
        methodName: {},
        /**
         * A method not returning any data
         * @type easyXDM.Configuration.Methods.LocalVoidMethod
         */
        voidMethodName: {},
        /**
         * An asynchronous method that is unable to return data immediately
         * This can for instance be a method using an xmlHttpRequest object to retrieve data
         * @type easyXDM.Configuration.Methods.LocalAsyncMethod
         */
        asyncMethodName: {}
    },
    /**
     * @class easyXDM.Configuration.RemoteConfiguration
     * The configuration for the remote property
     * @namespace easyXDM.Configuration
     */
    RemoteConfiguration: {
        /**
         * Methods are by default expected to return data
         * @type easyXDM.Configuration.Methods.RemoteMethod
         */
        methodName: {},
        /**
         * We do not expect any data back from this method
         * @type easyXDM.Configuration.Methods.RemoteVoidMethod
         */
        voidMethodName: {},
        /**
         * We do not need to know that the remote method is implemented asynchronous
         * @type easyXDM.Configuration.Methods.RemoteAsyncMethod
         */
        asyncMethodName: {}
    },
    /**
     * Contains description on the various method descriptions
     */
    Methods: {
		/**
		 * @class easyXDM.Configuration.Methods.Method
		 * The base method implementation
		 * @namespace easyXDM.Configuration.Methods
		 */
		Method:{
			
		},
        /**
         * @class easyXDM.Configuration.Methods.LocalMethod
         * @extends easyXDM.Configuration.Methods.Method
         * A method returning data
         * @namespace easyXDM.Configuration.Methods
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
         * @class easyXDM.Configuration.Methods.LocalVoidMethod
         * @extends easyXDM.Configuration.Methods.Method
         * A method not returning any data
         * @namespace easyXDM.Configuration.Methods
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
         * @class easyXDM.Configuration.Methods.LocalAsyncMethod
         * @extends easyXDM.Configuration.Methods.Method
         * An asynchronous method that is unable to return data immediately
         * This can for instance be a method using an xmlHttpRequest object to retrieve data
         * @namespace easyXDM.Configuration.Methods
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
         * @class easyXDM.Configuration.Methods.RemoteMethod
         * Methods are by default expected to return data
         * @namespace easyXDM.Configuration.Methods
         */
        RemoteMethod: {},
        /**
         * @class easyXDM.Configuration.Methods.RemoteVoidMethod
         * @extends easyXDM.Configuration.Methods.Method
         * We do not expect any data back from this method
         * @namespace easyXDM.Configuration.Methods
         */
        RemoteVoidMethod: {
            /**
             * We mark the method as void so that the framework will not wait for any response, and will not expect a callback method
             */
            isVoid: true
        },
        /**
         * @class easyXDM.Configuration.Methods.RemoteAsyncMethod
         * @extends easyXDM.Configuration.Methods.Method
         * We do not need to know that the remote method is implemented asynchronous
         * @namespace easyXDM.Configuration.Methods
         */
        RemoteAsyncMethod: {}
    }
};
// #endif
