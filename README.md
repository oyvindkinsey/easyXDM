easyXDM - easy Cross-Domain Messaging
=====================================
easyXDM is a javascript library created to enable web developers
to easily communicate and expose javascript API's across domain boundaries.

The library provides three layers of abstraction that simplifies development and usage.

easyXDM.transport and its contained classes all give access to 
a simple string based commmunication channel. This can be used directly 
to send strings between the two documents. The transports does not have any
dependencies outside the script itself and what the browser offers.

easyXDM.Channel wraps a Transport and uses a serializer to enable you
to send Javascript objects over the transport. This offer the most when used with 
the HTML5 JSON object, either via the navive implementation or through Douglas Crockfords json2 library.

easyXDM.Interface wraps a Channel and enables you to define exposed and
consumed methods. This then allows you to call methods, with arguments, 
across the domain boundary and have the result returned. The underlying protocol used is quite similar to json-rpc.

This also enables you to expose AJAX services in an easy way.

Usage
-----
There are several examples and demos at the [wiki](http://easyxdm.net/wiki/) and in the [documentation](http://easyxdm.net/docs).

Tests
-----
You can run the tests for the latest released version [here](http://easyxdm.net/current/tests/) 
or run the tests for the repository's master#HEAD [here](http://easyxdm.net/source/tests/)

