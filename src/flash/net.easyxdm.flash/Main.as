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



/* Security model:
 * SWF's can be loaded from any of the two domains, and messages are only received from these two.
 * Alternatively a single SWF can be loaded from a common domain (CDN).
 * security.allowXDomain is used to let the page interact with the SWF.
 * */

import flash.external.ExternalInterface;
import System.security;

/**
 * This class facilitates flash based communication between domains.
 * @author Øyvind Sean Kinsey
 */
class Main 
{	
	private static var INITIALIZED:Boolean = false;
	
	// only allow javascript accessors
	private static function Validate(input:String):Boolean {
		var i = input.length;
		while (i--) {
			var charCode = input.charCodeAt(i);
			if ( (charCode >= 64 && charCode <= 90 /*Uppercase*/) || (charCode >= 97 && charCode <= 122 /*Lowercase*/) ) continue;
			if (charCode >= 48 && charCode <= 57 /*Numbers*/) continue;
			if (charCode == 95/*_*/ || charCode == 36 /*$*/ || charCode == 45 /*-*/ || charCode == 46 /*.*/ || charCode == 58 /*:*/) continue;
			
			return false;
		}
		return true;
	}
	
	
	// docs at http://livedocs.adobe.com/flash/9.0/main/wwhelp/wwhimpl/js/html/wwhelp.htm
	public static function main(swfRoot:MovieClip):Void 
	{	
		// this is so that main can only be run once - this ensures that the domain passed really is the one
		// being used to communicate with the SWF.
		if (Main.INITIALIZED) return; else Main.INITIALIZED = true;
		
		// validate the passed arguments
		if (!Validate(_root.ns) || !Validate(_root.proto) || !Validate(_root.domain) || !Validate(_root.port) || !Validate(_root.callback)) return;
		
		// LocalConnection has a max length 
		var maxMessageLength = 40000;
		
		// map of all the senders
		var sendMap = { }, connectionMap = { };
		
		// set up the prefix as a string based accessor to remove the risk of XSS
		var prefix:String = _root.ns ? _root.ns + "." : "";
		
		// this will be our origin
		var origin = _root.proto + "//" + _root.domain + _root.port;
		
		// set up the logger, if any
		var log = _root.log == "true" ? function(msg) {
			ExternalInterface.call(prefix + "easyXDM.Debug.trace", " swf: " + msg);
		} : function() {
		};
		
			
		log("enabling communication with " + _root.domain);
		// allow javascript in the page to interact with the SWF
		security[_root.proto == "http:" ? "allowInsecureDomain" : "allowDomain"](_root.domain);
		// add the postMessage method
		ExternalInterface.addCallback("postMessage", { }, function(channel:String, message:String) {
			sendMap[channel](message);
		});
		
		// add the createChannel method
		ExternalInterface.addCallback("createChannel", { }, function(channel:String, secret:String, remoteOrigin:String, isHost:Boolean) {
			if (!Main.Validate(channel) || !Main.Validate(secret)) return;
			log("creating channel " + channel);
			
			// get the remote domain
			var remoteDomain:String = remoteOrigin.substr(remoteOrigin.indexOf("://") + 3);
			if (remoteDomain.indexOf(":") != -1) remoteDomain = remoteDomain.substr(0, remoteDomain.indexOf(":"));
			// the sending channel has _ prepended so that all allowed domains can use it
			var sendingChannelName:String =  "_" + channel + "_" + secret + "_" +  (isHost ? "consumer" : "provider");
			var receivingChannelName:String = "_" + channel + "_" + secret + "_" + (isHost ? "provider" : "consumer");	
			var incommingFragments = [];
			
			// set up the listening connection
			var listeningConnection:LocalConnection = connectionMap[channel] = new LocalConnection();
			// set up the sending connection 
			var sendingConnection:LocalConnection = new LocalConnection();
			
			// domain of the current SWF (for cdn support)
			var localSwfDomain:String = listeningConnection.domain();
					
			// allow messages from only the two possible domains
			listeningConnection.allowDomain = 
			listeningConnection.allowInsecureDomain = function(domain) {
				var allowed:Boolean = (domain == remoteDomain || domain == _root.domain || domain == localSwfDomain);
				log("allowDomain: " + allowed.toString());
				return allowed;
			};
			
			// set up the onMessage handler - this combines fragmented messages
			listeningConnection.onMessage = function(message, fromOrigin, remaining) {
				if (fromOrigin !== remoteOrigin) {
					log("received message from " + fromOrigin + ", expected from " + remoteOrigin);	
					return;
				}
				incommingFragments.push(message);
				if (remaining <= 0) {
					log("received final fragment");	
					// escape \\ and pass on 
					ExternalInterface.call(prefix + "easyXDM.Fn.get(\"flash_" + channel + "_onMessage\")", incommingFragments.join("").split("\\").join("\\\\"), remoteOrigin);
					incommingFragments = [];
				}else {
					log("received fragment, length is " + message.length + " remaining is " + remaining);	
				}
			};
			
			// the host must delay calling channel_init until the other end is ready
			listeningConnection.onReady = function() {
				log("received ready");
				if (isHost) {
					log("calling ready");
					sendingConnection.send(sendingChannelName, "onReady");
					ExternalInterface.call(prefix + "easyXDM.Fn.get(\"flash_" + channel + "_init\")");	
				}
			};
			
			// connect 
			if (listeningConnection.connect(receivingChannelName)) {
				log("listening on " + receivingChannelName);	
			} else {
				log("could not listen on " + receivingChannelName);	
			}
			
			sendingConnection.onStatus = function(infoObject:Object) {
				log("level: " + infoObject.level);
			};
			
			sendMap[channel] = function(message:String) {
				log("sending to " + sendingChannelName + ", length is " + message.length);
				
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

			// start the channel
			if (!isHost) {
				log("calling ready");
				sendingConnection.send(sendingChannelName, "onReady");
				ExternalInterface.call(prefix + "easyXDM.Fn.get(\"flash_" + channel + "_init\")");	
			}
		});
		
		// add the destroyChannel method
		ExternalInterface.addCallback("destroyChannel", { }, function(channel:String) {
			delete sendMap[channel];
			connectionMap[channel].close();
			delete connectionMap[channel];
		});
		
		// kick things off
		log("calling init");
		ExternalInterface.call(prefix + "easyXDM.Fn.get(\"" + _root.callback + "\")");
	}
}