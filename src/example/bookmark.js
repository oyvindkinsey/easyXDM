(function(){
    var s1, s2, isLoaded = false, xhr, head = document.getElementsByTagName('head')[0];
    function scriptOnLoad(){
        if (isLoaded || typeof easyXDM === "undefined" || typeof JSON === "undefined") {
            return;
        }
        isLoaded = true;
        xhr = new easyXDM.Rpc({
            remote: "../xhr.html",
            onReady: function(){
                xhr.post("example/glossary.php", {
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
    s1 = document.createElement("script");
    s1.type = "text/javascript";
    s1.src = "../easyXDM.debug.js";
    s1.onreadystatechange = function(){
        if (this.readyState === "complete" || this.readyState === "loaded") {
            scriptOnLoad();
        }
    };
    s1.onload = scriptOnLoad;
    head.appendChild(s1);
    
    if (typeof JSON === "undefined" || !JSON) {
        s2 = document.createElement("script");
        s2.type = "text/javascript";
        s2.src = "../json2.js";
        s2.onreadystatechange = function(){
            if (this.readyState === "complete" || this.readyState === "loaded") {
                scriptOnLoad();
            }
        };
        s2.onload = scriptOnLoad;
        head.appendChild(s2);
    }
    
})();
