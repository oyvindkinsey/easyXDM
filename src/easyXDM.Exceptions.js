easyXDM.Exceptions = {
    /**
     * @class easyXDM.Exceptions.Exception
     * @constructor
     * @param {String} msg The exception message
     * @namespace easyXDM.Exceptions
     */
    Exception: function(msg){
        /**
         * @property
         * @type String
         */
        this.message = msg;
        /**
         * @property
         * @type String
         */
        this.name = "GenericException";
    },
    /**
     * @class easyXDM.Exceptions.MissingCallbackException
     * @namespace easyXDM.Exceptions
     * @extends easyXDM.Exceptions.Exception
     * @constructor
     * @param {String} msg The exception message
     */
    MissingCallbackException: function(msg){
        this.message = msg;
        this.name = "MissingCallbackException";
    }
};
