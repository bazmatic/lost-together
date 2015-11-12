var request = require('request');
var querystring = require('querystring');
var Utils = require('./utils.js');
var settings;
var DEBUG = true; //TODO: Change to config file or app setting

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
						"from": Utils.leftStr((from || self.settings.from), 10),
						"maxsplit": self.settings.maxsplit,
						"message": text
					}
					var url = self.settings.host + '?' + querystring.stringify(toSend);

					request.get( url, function( err ){
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