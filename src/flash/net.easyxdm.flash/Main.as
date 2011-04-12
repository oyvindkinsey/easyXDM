
import flash.external.ExternalInterface;
import System.security;

/**
 * ...
 * @author Øyvind Sean Kinsey
 */
class Main 
{
	
	public static function main(swfRoot:MovieClip):Void 
	{
		// entry point		
		
		// these should be stored in a map
		var sendMap = { };
		var callbackMap = { };
		
		ExternalInterface.addCallback("postMessage", { }, function(channel:String, message:String, origin:String) {
				var fn = sendMap[channel];
				ExternalInterface.call("log", "using fn " + channel + " from sendMap" );
				fn(message, origin);
				ExternalInterface.call("log", "typeof :" +  fn );
			});
				
			// add the postMessage method

		 
		
		ExternalInterface.addCallback("createChannel", { }, function(channel:String, remoteOrigin:String, isHost:Boolean, callback:") {
			// reference a new instance added to the map
			var sendingChannelName = "_" + channel + (isHost ? "_consumer" : "_provider");
			var receivingChannelName = "_" +  channel + (isHost ? "_provider" : "_consumer");	
			
			var sendingConnection:LocalConnection = new LocalConnection();
			sendMap[channel] = function(message, origin) {
				ExternalInterface.call("log", "sending to " + sendingChannelName);
				sendingConnection.send(sendingChannelName, "onMessage", message);
			};

			var listeningConnection:LocalConnection  = new LocalConnection();
			listeningConnection.onMessage = function(message) {
				ExternalInterface.call("onMessage", message, remoteOrigin);
			};
			listeningConnection.allowDomain = function(origin:String) {
				ExternalInterface.call("log", "allowing " + origin);
				return true;
			};
        });

			if (listeningConnection.connect(receivingChannelName)) {
				ExternalInterface.call("log", "listening on " + receivingChannelName);	
			} else {
				ExternalInterface.call("log", "could not listen on " + receivingChannelName);	
			}
			
			
			//ExternalInterface.call("alert", "setup");
		});
		
		
		ExternalInterface.call("init");
	}
	
	public function Main() 
	{
		
	}
	
}