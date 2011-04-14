//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//


import flash.external.ExternalInterface;
import System.security;

/**
 * This class facilitates flash based communication between domains.
 * @author Øyvind Sean Kinsey
 */
class Main 
{	
	public static function main(swfRoot:MovieClip):Void 

	{	
		// LocalConnection has a max length 
		var maxMessageLength = 40000;
		
		// map of all the senders
		var sendMap = { };
		
		var initCallback:String = _root.init;
		var tracer:String = _root.log;
		
		var log = function(msg) {
			if (tracer) {
				// for debug purposes we expect the domain to be the correct one
				ExternalInterface.call(tracer, " swf: " + msg);
			}
		}
		
		log("allowing communication to " + _root.domain);
		if (_root.proto == "http:") {
			security.allowInsecureDomain(_root.domain);
		} else {
			security.allowDomain(_root.domain);
		}
		
		// add the postMessage method
		ExternalInterface.addCallback("postMessage", { }, function(channel:String, message:String) {
			sendMap[channel](message);
		});

		// add the createChannel method
		ExternalInterface.addCallback("createChannel", { }, function(channel:String, remoteOrigin:String, isHost:Boolean, callback:String, key:String) {
			log("creating channel " + channel);
			// reference a new instance added to the map
			var sendingChannelName = "_" + channel + "_" + key + "_" + (isHost ? "_consumer" : "_provider");
			var receivingChannelName = "_" +  channel + "_" + key + "_" + (isHost ? "_provider" : "_consumer");	
			
			// set up the sending connection and store it in the map
			var sendingConnection:LocalConnection = new LocalConnection();
			sendMap[channel] = function(message) {
				log("sending to " + sendingChannelName + ", length is " + message.length);
				
				var origin = _root.proto + "//" + _root.domain;
				var fragments = [], fragment, length = message.length, pos = 0;
				while (pos <= length) {
					fragment = message.substr(pos, maxMessageLength);;
					pos += maxMessageLength;
					log("fragmentlength: " + fragment.length + ", remaining: " + (length - pos))
					if (!sendingConnection.send(sendingChannelName, "onMessage", fragment, origin, length - pos)) {
						log("sending failed");
					}
				}
			};

			var incommingFragments = [];
			
			// set up the listening connection
			var listeningConnection:LocalConnection  = new LocalConnection();
			listeningConnection.onMessage = function(message, origin, remaining) {
				log("received message from " + origin  + " of length " + message.length + " with " + remaining + " remaining");	
				if (origin !== remoteOrigin) {
					log("wrong origin, expected " + remoteOrigin);	
					return;
				}
				
				incommingFragments.push(message);
				
				// escape \\ and pass on 
				if (remaining <= 0) {
					log("received final fragment");	
					ExternalInterface.call(callback, incommingFragments.join("").split("\\").join("\\\\"), origin);
					incommingFragments = [];
				}else {
					log("received fragment, length is " + message.length + " remaining is " + remaining);	
				}
			};
			
			// allow all domains to connect as we enforce the origin check in the onMessage handler and in the js
			listeningConnection.allowDomain = function() {
				return true;
			};
			
			// connect 
			if (listeningConnection.connect(receivingChannelName)) {
				log("listening on " + receivingChannelName);	
			} else {
				log("could not listen on " + receivingChannelName);	
			}
		});
		
		// add the destroyChannel method
		ExternalInterface.addCallback("destroyChannel", { }, function(channel:String) {
			delete sendMap[channel];
		});
		
		// kick things off
		log("calling init");
		ExternalInterface.call(initCallback);
	}
	
	public function Main() 
	{
		
	}
	
}