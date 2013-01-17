easyXDM - easy Cross-Domain Messaging
=====================================
easyXDM is a Javascript library that enables you as a developer to easily work around the limitation set in place by the Same Origin Policy, in turn making it easy to communicate and expose javascript API's across domain boundaries.

**Some of the goals for the project are that it should**

* be easy to use!!!
* be self contained, <del>no dependencies</del> (Now requires Flash for the FlashTransport) (not counting JSON)
* be light weight
* be flexible
* have good code quality (uses jslint etc)
* have good documentation
* be the best xdm-library in existence

How easyXDM works 
---------------
At the core easyXDM provides a transport stack capable of passing string based messages between two windows, a **consumer** (the main document) and a **provider** (a document included using an iframe).
It does this by using one of several available techniques, always selecting the most efficient one for the current browser.    
For all implementations the transport stack offers bi-directionality, reliability, queueing and sender-verification.

Using JavaScript only (no Flash, Silverlight, extra html files etc) easyXDM provides the following browsers with stacks with latency of less than 15ms:

* IE8+ - using the PostMessageTransport
* Opera 9+ - using the PostMessageTransport (support for both Operas old standard and the HTML5 standard)
* Firefox 1-2 - using the FrameElementTransport
* Firefox 3+ - using the PostMessageTransport
* Safari 4+ - using the PostMessageTransport
* Chrome 2+ - using the PostMessageTransport

In browsers not mentioned here, and not supporting the *postMessage* API, the following transports will be used, depending on support and configuation:

* FlashTransport - Requires Flash 6+ and the swf property to be configured and will load a single swf into the document that functions as a factory. The swf has been audited by Google Security researchers. 
* NameTransport - Requires an html-file (name.html) to be hosted on each of the two domain. The cache-directives in the file allows the transport to pass messages with speeds similar to postMessage without incurring extra HTTP-requests.
* HashTransport - If no other transport can be used, then the HashTransport will be used.

How to use easyXDM
------------------
When using easyXDM you first load the *consumer* document and then **let easyXDM load** the *provider*. This is by default done in a hidden iframe, but you can also configure easyXDM to display the iframe in a specific container, and with a specific style attached. 

The library provides two main object types that utilize this transport stack:

The easyXDM.Socket
-----------------
.. is a thin wrapper around the transport stack and lets you send strings between the consumer and the provider.

To set up a simple Socket this is what you will need to add to the *consumer*

```javascript

    var socket = new easyXDM.Socket({
        remote: "http://path.to/provider/", // the path to the provider
        onMessage:function(message, origin) {
            //do something with message
        }
    });
```

And this is what's needed for the *provider*

```javascript
    var socket = new easyXDM.Socket({
        onMessage:function(message, origin) {
            //do something with message
        }
    });
```

Use this for sending the strings to the other end:

```javascript
    socket.postMessage("hello world");
```

In addition the following config properties can be set for both consumer and provider

* `onReady` - If you set this to a function, then this will be called once the communication has been established.
* `local` {String} - To enable the NameTransport as a fallback, set this to point to the `name.html` file on the current domain.
* `swf` {String} - To enable the FlashTransport for IE6/7 you need to point this towards your `easyxdm.swf` file. The swf must reside on one of the two domains (consumer and provider can use its own copy), or on a shared CDN used by both the consumer and provider.
* `swfNoThrottle` {Boolean} - Set this to true if you want to have the swf/iframe placed visibly (20x20px top right corner) in order to avoid being throttled in newer versions of Flash
* `swfContainer` {String || DOMElement) - Set this if you want to control where the swf is placed.

These properties can be set only on the consumer

* `lazy` {Boolean} - If you set this to `true` then the iframe will not be created until the first use of the Socket
* `container` {String || DOMElement} - Set this to an id or element if you want the iframe to be visible for interaction.
* `props` {Object} - The key/value pairs of this object will be deep-copied onto the iframe. As an example, use `props: {style: {border: "1px solid red"} }` to set the border of the iframe to 1px solid red.
* `remoteHelper` {String} - To enable the NameTransport as a fallback, set this to point to the `name.html` file on the provider.
* `hash` {Boolean} - Whether to pass the setup data using the hash instead of using the query. This is mainly useful in scenarios where query arguments affects efficient caching or where the providers HTTP server does not support URL's with query parameters. Using the hash is not compatible with hash based history managers etc.

These properties can be set only on the provider

* `acl` {String || String[]} Use this to only allow specific domains to consume this provider. The patterns can contain the wildcards ? and * as in the examples 'http://example.com', '*.foo.com' and '*dom?.com', or they can be regular expressions starting with ^ and ending with $. If none of the patterns match an Error will be thrown.

A socket can be torn down (removing the `iframe`, etc.) using 

```javascript
    socket.destroy();
```

The easyXDM.Rpc
---------------
... constructor lets you create a proxy object with method stubs and uses JSON-RPC to invoke these methods and return the responses.

The Rpc uses the same transport stack as the Socket, and so **uses the same config properties**.

To set up a simple Rpc this is what you will need to add to the *consumer*

```javascript
    var rpc = new easyXDM.Rpc({
        remote: "http://path.to/provider/" // the path to the provider
    }, 
    {
        local: {
            helloWorld: function(successFn, errorFn){
                // here we expose a simple method with no arguments
                // if we want to return a response, we can use `return ....`,
                // or we can use the provided callbacks if the operation is async
                // or an error occurred
            }
        },
        remote: {
            helloWorld:{
                // here we tell the Rpc object to stub a method helloWorld for us
            }
        }
    });
```

Call the methods like this 

```javascript
    rpc.helloWorld(1,2,3, function(response){
        // here we can do something with the return value from `helloWorld`
    }, function(errorObj){
        // here we can react to a possible error
    };
```

And this is what's needed for the *provider*

```javascript
    var rpc = new easyXDM.Rpc({},
    {
        local: {
            helloWorld: function(one, two, thre_args, successFn, errorFn){
                // here we expose a simple method with three arguments
                // that returns an object
                return {
                    this_is: "an object"
                };
            }
        },
        remote: {
            helloWorld:{
                // here we tell the Rpc object to stub a method helloWorld for us
            }
        }
    });
```

Call the methods like this 

```javascript
    rpc.helloWorld(); // easyXDM automatically changes it's behavior depending on the presence of callback methods for `success` and for `error`. 
```

The Rpc configurations `local` and `remote` properties can be left out if empty. Both properties can have multiple methods defined.

When calling the stubs you can provide up to two callback functions after the expected arguments, the first one being the method that will receive the callback in case of a success, and the next the method that will receive the callback in case of an error.

If an error occurs in the execution of the stubbed method then this will be caught and passed back to the error handler. This means that you in the body of the exposed method can use ` throw "custom error";` to return a message, or you can pass a message, and an optional object containing error data to the error callback.
If the error handler is present, then this will be passed an object containing the properties

* `message` {String} - The message returned from the invoked method
* `data` {Object} - The optional error data passed back.

In addition to the `local` and `remote` properties, you can set the following

* `serializer` {Object} - An object conforming with methods matching the standardized `window.JSON` object.

In order for easyXDM.Rpc to use JSON-RPC it needs access to functioning encode/decode methods for JSON, and this can be provided by setting the `serializer`. If not set easyXDM will try to use the native JSON object, and will even work with the faulty `toJSON ` and `evalJSON` provided by earlier Prototype Js.

If you want to conditionally include Douglas Crockfords JSON2 library (or any other that will provide window.JSON) then you can add this directly after the script that includes easyXDM

```html
    <script type="text/javascript">
        easyXDM.DomHelper.requiresJSON("http://path/to/json2.js");
    </script>
```

This will only include it if not natively supported.

An rpc object can be teared down (iframe removed etc) using 

```javascript
    rpc.destroy();
```

The shipped /cors/ interface
-----
Since either end is free to use AJAX etc the Rpc object can be used to easily expose enable cross-domain AJAX. For this the library comes with a default `/cors/index.html` (`/cors/`) document that exposes a method `request(object config, function successFn, function errorFn)`, where config can have the following properties:

* `url` {string} - The url to request
* `method` {string} - GET or POST. Default POST
* `headers` {object} - A map of headers to apply - the defaults are `"Content-Type": "application/x-www-form-urlencoded"` and `"X-Requested-With": "XMLHttpRequest"`. Set headers are added to the default, null values removed.
* `timeout` {number} - the number of milliseconds before a timeout occurs. Default 10000 (10 seconds)
* `data´ {object} - a map of the data to pass

If the request succeeds the success handler will be passed an object with the following properties

* `data` {string} - the responseText
* `status` {number} - The status of the request
* `headers` {object} - a map of the returned headers

If the request fail the error handler will be passed an object with the following properties

* `data` {string} - the responseText if available, or null
* `status` {number} - The status of the request
* `message` {string} - A friendly message explaining the error

This is how you can use it:

```javascript
    var rpc = new easyXDM.Rpc({
		remote: "http://foo.bar/cors/"
	},
    {
        remote: {
			request: {}
		}
    });

	rpc.request({
		url: "/resource/x/y/z/",
		method: "POST",
		data: {foo: "bar", bar: "foo"}
	}, function(response){
		alert(response.data);
	});
```

easyXDM.noConflict
-----

If you want two or more instances of easyXDM to run on the same page, you can put your instance into a namespace using easyXDM.noConflict method. This method returns control of easyXDM global object to the other library and returns an instance of itself.

This is useful if you embed your code on the page and cannot guarantee that it does not already define window.easyXDM.

It also takes a single argument, a string representation of the namespace. We need it to get access to the instance in the parent window (when using SameOriginTransport).

Example:

```javascript
	// Let's assume we already have an instance of easyXDM on the page, but
	// we need to load another one and put it under PROJECT.easyXDM. Here is
	// how you do it.
	var PROJECT = { easyXDM: easyXDM.noConflict("PROJECT") };
```

For more information
-----

There are several examples and demos available through the main [website](http://easyxdm.net/), and in the [documentation](http://easyxdm.net/docs/).

Tests
-----
For development a test suit is used - you can run this here:

* for the [current version ](http://easyxdm.net/current/tests/) 
* for the repository's [master#HEAD](http://easyxdm.net/dev/tests/)


License
=======
easyXDM is distributed under the MIT license. Please keep the exisisting headers.

Attribution
======
Main developer
Øyvind Sean Kinsey - <oyvind@kinsey.no>, @okinsey, http://kinsey.no

The following has contributed to the project

* [Anton Kovalyov](http://self.kovalyov.net/) - Added the `noConflict` feature.
* [Eli Grey](http://eligrey.com/) - The /cors/ interface is adapted from his project [pmxdr](http://github.com/eligrey/pmxdr/)
* [Peter Michaux](http://peter.michaux.ca/articles/feature-detection-state-of-the-art-browser-scripting) - Feature detection is based on his article
* [Juriy Zaytsev - kangax](http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/) - Implementation of isArray 
* ++ many people through feedback
