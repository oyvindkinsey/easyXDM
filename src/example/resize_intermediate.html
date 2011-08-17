<!doctype html>
<html>
    <head>
        <title>easyXDM</title>
        <script type="text/javascript" src="../easyXDM.debug.js"></script>
        <script type="text/javascript">
            var iframe;
            var socket = new easyXDM.Socket({
                swf : "../easyxdm.swf",
                onReady : function() {
                    iframe = document.createElement("iframe");
                    iframe.frameBorder = 0;
                    document.body.appendChild(iframe);
                    iframe.src = easyXDM.query.url;

                    var timer;
                    iframe.onload = function() {
                        var d = iframe.contentWindow.document;
                        var originalHeight = d.body.clientHeight || d.body.offsetHeight || d.body.scrollHeight;

                        // We want to monitor the document for resize events in case of the use of accordions and such,
                        // but unfortunately only the window node emits the resize event, and we need the body's.
                        // The only solution then is to use polling..

                        // Lets start the polling if not all ready started
                        if(!timer) {
                            timer = setInterval(function() {
                                try {
                                    var d = iframe.contentWindow.document;
                                    var newHeight = d.body.clientHeight || d.body.offsetHeight || d.body.scrollHeight;
                                    if(newHeight != originalHeight) {
                                        // The height has changed since last we checked
                                        originalHeight = newHeight;
                                        socket.postMessage(originalHeight);
                                    }
                                } catch(e) {
                                    // We tried to read the property at some point when it wasn't available
                                }
                            }, 300);
                        }
                        // Send the first message
                        socket.postMessage(originalHeight);
                    };
                },
                onMessage : function(url, origin) {
                    iframe.src = url;
                }
            });

        </script>
        <style type="text/css">
            html, body {
                overflow: hidden;
                margin: 0px;
                padding: 0px;
                width: 100%;
                height: 100%;
            }
            iframe {
                width: 100%;
                height: 100%;
                border: 0px;
            }
        </style>
    </head>
    <body></body>
</html>
