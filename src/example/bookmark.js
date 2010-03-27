(function(){
    var script, isLoaded = false, xhr;
    function scriptOnLoad(){
        if (isLoaded) {
            return;
        }
        isLoaded = true;
        xhr = new easyXDM.Rpc({
            remote: "../xhr.html",
            onReady: function(){
                xhr.post("example/glossary.json", {
                    param1: "a",
                    param2: "b"
                }, function(json){
                    alert(json.glossary.title);
                });
            }
        }, {
            remote: {
                post: {}
            }
        });
        
    }
    script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "../easyXDM.debug.js";
    script.onreadystatechange = function(){
        if (this.readyState === "complete" || this.readyState === "loaded") {
            scriptOnLoad();
        }
    }
    script.onload = scriptOnLoad;
    
    document.getElementsByTagName('head')[0].appendChild(script);
})();
