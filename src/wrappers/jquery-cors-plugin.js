/*global jQuery, easyXDM, XDomainRequest */

(function($){
    var xhr = $.ajaxSettings.xhr();
	
    // jQuery does not properly support XDomainRequest, nor does XDomainRequest fully support things like headers etc.
    if ("withCredentials" in xhr) {
        $.cors = function(config){
            config.beforeSend = function(xhr){
                for (var prop in config.headers) {
                    if (config.headers.hasOwnProperty(prop)) {
                        xhr.setRequestHeader(prop, config.headers[prop]);
                    }
                }
            };
            
            $.ajax(config);
        };
        $.cors.isNative = true;
    }
    else {
        $.cors = function(config){
            var remoteDomain = config.url.match(/^(http.?:\/\/([^\/\s]+))/)[1];
            
            var rpc = new easyXDM.Rpc({
                remote: remoteDomain + $.cors.defaultPath
            }, {
                remote: {
                    request: {}
                }
            });
            $.cors = function(config){
                var rpcRequest = {
                    url: config.url,
                    method: config.type || "GET",
                    data: config.data
                };
                rpc.request(rpcRequest, function(response){
                    var data = (config.dataType == "json") ? $.parseJSON(response.data) : response.data;
                    config.success(data, response.status, {
                        status: response.status,
                        responseText: response.data,
                        headers: response.headers
                    });
                }, function(response){
                    config.error({
                        status: response.status,
                        responseText: response.data
                    }, response.message);
                });
            };
            $.cors(config);
        };
        $.cors.isNative = false;
        $.cors.defaultPath = "/easyxdm/cors/";
    }
    
    xhr = null;
})(jQuery);
