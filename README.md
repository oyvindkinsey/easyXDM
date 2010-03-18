easyXDM - easy Cross-Domain Messaging
=====================================
easyXDM is a javascript library created to enable web developers
to easily communicate and expose javascript API's across domain boundaries.

Some of the goals for the project are that it should

* be easy to use!!!
* be self contained, no dependencies (not counting JSON)
* be light weight
* be flexible
* have good code quality (uses jslint etc)
* have good documentation
* be the best xdm-library in existence

The library provides two layers of *abstraction* that simplifies development and usage.

**easyXDM.Socket** 
gives access to a simple string based transport stack which can be used to send strings between two documents in different domains. 
The underlying transport stacks does not have any dependencies outside the script itself and what the browser offers.

**The transport stacks all offer reliability, queueing and sender-verification.**

**easyXDM.Rpc** 
lets you call methods with arguments and return values across the domain boundary. 
The underlying protocol used is quite similar to JSON-RPC.
Since the remote end is free to use AJAX etc the Rpc class can be used to easily expose AJAX in a cross-domain fashion.

The library also supplies a default xhr.html document that exposes a method 'post(String url, [Object data], function fn)'.

** The xhr.html document should be extended to filter the incoming requests to only allowed resources.**
 
Usage
-----
There are several examples and demos at the [wiki](http://easyxdm.net/wiki/) and in the [documentation](http://easyxdm.net/docs).

Tests
-----
You can run the tests for the latest released version [here](http://easyxdm.net/current/tests/) 
or run the tests for the repository's master#HEAD [here](http://easyxdm.net/dev/tests/)

