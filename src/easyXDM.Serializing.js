easyXDM.Serializing = {
    // #ifdef debug
    /**
     * @class easyXDM.Serializing.ISerializer
     * The Interface implemented by all serializers.<br/>
     * Only available in debug mode.
     * @namespace easyXDM.Serializing
     */
    ISerializer: {
        /**
         * Serializes an object and returns it as a string
         * @param {Object} data The data to serialize
         * @returns The serialized string
         * @type {String}
         */
        stringify: function(data){
        
        },
        /**
         * Deserializes a string and returns an object
         * @param {String} message The string to deserialize
         * @returns An object
         * @type {Object}
         */
        parse: function(message){
        
        }
    },
    // #endif
    /**
     * @class easyXDM.Serializing.hashTableSerializer
     * A serializer that can convert to and from hashtables
     * It uses the same format as the query string for its serialized data
     * @namespace easyXDM.Serializing
     */
    hashTableSerializer: {
        /**
         * Serializes a hashtable and returns it as a string
         * @param {Object} data The data to serialize
         * @returns The serialized string
         * @type {String}
         */
        stringify: function(data){
            var message = "";
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    message += key + "=" + escape(data[key]) + "&";
                }
            }
            return message.substring(0, message.length - 1);
        },
        /**
         * Deserializes a string and returns a hashtable
         * @param {String} message The string to deserialize
         * @returns An hashtable populated with key-value pairs
         * @type {Object}
         */
        parse: function(message){
            var data = {};
            var d = message.split("&");
            var pair, key, value;
            for (var i = 0, len = d.length; i < len; i++) {
                pair = d[i];
                key = pair.substring(0, pair.indexOf("="));
                value = pair.substring(key.length + 1);
                data[key] = unescape(value);
            }
            return data;
        }
    }
};
