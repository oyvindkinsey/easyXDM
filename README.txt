easyXDM is a javascript library created to enable web developers
to easily expose javascript API's across domain boundaries.

The library provides three layers of abstraction to current methods.

easyXDM.Transport and its contained classes all give access to 
a simple string based commmunication channel. This can be used directly 
to send strings between the two documents.

easyXDM.Channel wraps a Transport and uses a serializer to enable you
to send Javascript objects over the transport.

easyXDM.Interface wraps a Channel and enables you to define exposed and
consumed methods. This then allows you to call methods, with arguments, 
across the domain boundary and have the result returned.

This also enables you to expose AJAX services in an easy way.

USAGE
Place easyXDM.js/easyXDM.min.js/easyXDM.debug.js and hash.html on your domain.
json2.js should also be placed there if you intend to use easyXDM.Interface,
or a easyXDM.Channel with the JSON serializer.

Follow the documentation and examples at http://easyxdm.net/docs for more.