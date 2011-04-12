
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
		ExternalInterface.call("console.log", "main");
				
		// entry point		
		var domain = _root.domain;
		
		if (_root.proto === "http:") {
			ExternalInterface.call("log", "allowInsecureDomain" );
			security.allowInsecureDomain(domain);
		} else {
			ExternalInterface.call("log", "allowDomain" );
			security.allowDomain(domain);
		}
		
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

		ExternalInterface.addCallback("setup", { }, function(channel:String, remoteOrigin:String, isHost:Boolean) {
			// reference a new instance added to the map
			var sendingChannelName = "_" + channel + (isHost ? "_consumer" : "_provider");
			var receivingChannelName = "_" + channel + (isHost ? "_provider" : "_consumer");
			
			var listeningConnection:LocalConnection  = new LocalConnection();
			listeningConnection.allowDomain = function(origin) {
				var allowed:Boolean = origin === remoteOrigin.substring(remoteOrigin.indexOf("://") + 3);
				ExternalInterface.call("log", "allowing " + origin +": " + allowed);
				return allowed;
			};
			
			var sendingConnection:LocalConnection = new LocalConnection();
			listeningConnection.connect(receivingChannelName);
			ExternalInterface.call("log", "listening on " + receivingChannelName);
				
			sendMap[channel] = function(message, origin) {
				ExternalInterface.call("log", "sending to " + sendingChannelName);
				sendingConnection.send(sendingChannelName, "onMessage", message);
			};

			listeningConnection.onMessage = function(message) {
				ExternalInterface.call("onMessage", message, remoteOrigin);
			};
			
			//ExternalInterface.call("alert", "setup");
		});
		
		
		ExternalInterface.call("init");
	}
	
	public function Main() 
	{
		
	}
	
}