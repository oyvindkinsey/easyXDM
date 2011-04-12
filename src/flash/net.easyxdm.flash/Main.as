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
		// map of all the senders
		var sendMap = { };
		
		// our origin
		var initCallback:String = _root.init;
		var tracer:String = _root.log;
		
		var log = function(msg) {
			if (tracer) {
				ExternalInterface.call(tracer, msg);
			}
		}
		
		// add the postMessage method
		ExternalInterface.addCallback("postMessage", { }, function(channel:String, message:String) {
			sendMap[channel](message);
		});
				
		ExternalInterface.addCallback("createChannel", { }, function(channel:String, remoteOrigin:String, isHost:Boolean, callback:String, key:String) {
			var allowedDomain = remoteOrigin.substring(remoteOrigin.indexOf("://") + 3).split("/")[0] + ":";
			allowedDomain = allowedDomain.substring(0, allowedDomain.indexOf(":"));
			
			// reference a new instance added to the map
			var sendingChannelName = "_" + channel + "_" + key + "_" + (isHost ? "_consumer" : "_provider");
			var receivingChannelName = "_" +  channel + "_" + key + "_" + (isHost ? "_provider" : "_consumer");	
			
			// set up the sending connection and store it in the map
			var sendingConnection:LocalConnection = new LocalConnection();
			sendMap[channel] = function(message) {
				log("sending to " + sendingChannelName);
				sendingConnection.send(sendingChannelName, "onMessage", message);
			};

			// set up the listening connection
			var listeningConnection:LocalConnection  = new LocalConnection();
			listeningConnection.onMessage = function(message) {
				log("received message");	
				ExternalInterface.call(callback, message, remoteOrigin);
			};
			
			// only allow the intended domain access to this connection
			listeningConnection.allowDomain = function(domain:String) {
				log("allowed: " + allowedDomain === domain);	
				return allowedDomain === domain;
			};

			// connect 
			if (listeningConnection.connect(receivingChannelName)) {
				log("listening on " + receivingChannelName);	
			} else {
				log("could not listen on " + receivingChannelName);	
			}
		});
		ExternalInterface.addCallback("destroyChannel", { }, function(channel:String) {
			delete sendMap[channel];
		});
		ExternalInterface.call(initCallback);
	}
	
	public function Main() 
	{
		
	}
	
}