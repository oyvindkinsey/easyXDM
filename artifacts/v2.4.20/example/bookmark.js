var myBookmark = (function(){
    var s1, s2, isLoaded = false, xhr, head = document.getElementsByTagName('head')[0];
    var scripts = document.getElementsByTagName("script");
    var REMOTE = (function(){
        var remote = location.href;
        switch (location.host) {
            case "provider.easyxdm.net":
                location.href = remote.replace("provider", "consumer");
                break;
            case "xdm1":
                remote = remote.replace("xdm1", "xdm2");
                break;
            default:
                remote = "http://provider.easyxdm.net/current/example/";
        }
        return remote.substring(0, remote.lastIndexOf("/"));
    }());
    
    function run(){
        if (typeof xhr === "undefined") {
            return;
        }
        xhr.post("example/glossary.php", {
            param1: "a",
            param2: "b"
        }, function(json){
            alert(json.glossary.title);
        });
    }
    
    function scriptOnLoad(){
        if (isLoaded || typeof easyXDM === "undefined" || typeof JSON === "undefined") {
            return;
        }
        isLoaded = true;
        xhr = new easyXDM.Rpc({
            remote: REMOTE + "/../xhr.html",
            onReady: function(){
                run();
            }
        }, {
            remote: {
                post: {}
            }
        });
        
    }
    s1 = document.createElement("script");
    s1.type = "text/javascript";
    s1.src = REMOTE + "/../easyXDM.debug.js";
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
        s2.src = REMOTE + "/../json2.js";
        s2.onreadystatechange = function(){
            if (this.readyState === "complete" || this.readyState === "loaded") {
                scriptOnLoad();
            }
        };
        s2.onload = scriptOnLoad;
        head.appendChild(s2);
    }
    return {
        run: run
    };
})();
