var request = require('request');
var querystring = require('querystring');
var settings;
var DEBUG = true;

var handle = (function(){
	var self = this;

	self.settings = null;

	(function loadSettings(){
		// Load SMS settings
		var fs = require('fs');
		fs.readFile( __dirname + "/./sms.json", function(err,smsSettings){
			if(!err) {
				self.settings = JSON.parse(smsSettings);
			};
		});
	})();

	return {
		'sendSms': function( to, text, from, callback ) {
			if (DEBUG)
			{
				callback(null);
			}
			else
			{
				if( self.settings ) {
					var toSend =
					{
						"username": self.settings.username,
						"password": self.settings.password,
						"to": to,
						"from": from || self.settings.from,
						"maxsplit": self.settings.maxsplit,
						"message": text
					}

					request.get( self.settings.host + '?' + querystring.stringify(toSend), function( err ){
						if (err)
						{
							console.error(err);
						}
						callback(err, toSend);
					});
				} else {
					console.log("No SMS settings");
					callback(null);
				}
			}
		}
	}
})();

module.exports = handle;