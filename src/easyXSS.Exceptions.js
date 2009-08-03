easyXSS.Exceptions = {
    /**
     * @class easyXSS.Exceptions.Exception
     * @constructor
     * @param {String} msg The exception message
     * @namespace easyXSS.Exceptions
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
     * @class easyXSS.Exceptions.MissingCallbackException
     * @namespace easyXSS.Exceptions
     * @extends easyXSS.Exceptions.Exception
     * @constructor
     * @param {String} msg The exception message
     */
    MissingCallbackException: function(msg){
        this.message = msg;
        this.name = "MissingCallbackException";
    }
};
