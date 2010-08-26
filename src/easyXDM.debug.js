/*jslint evil: true */
/**
 * This just aggregates all the separate files
 */
(function(){
    var scripts = document.getElementsByTagName("script"), src = scripts[scripts.length - 1].src.replace("easyXDM.debug.js", "");
    
    document.write(unescape("%3Cscript src='" + src + "Core.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "Debug.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "DomHelper.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "Fn.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "Socket.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "Rpc.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/SameOriginTransport.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/PostMessageTransport.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/FrameElementTransport.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/NixTransport.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/NameTransport.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/HashTransport.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/ReliableBehavior.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/QueueBehavior.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/VerifyBehavior.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/RpcBehavior.js' type='text/javascript'%3E%3C/script%3E"));
}());
