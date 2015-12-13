exports.DEFAULT_APP = "woodfordfriends";
exports.DOMAIN = process.env.IP || "66.228.50.213;"
exports.PORT = process.env.PORT || 9375;
exports.USER_LOCATION_TTL = 5 * 60 * 1000;

var DB_NAME = "friends"; //TODO: Move to a config file
var SECRET = "vaU1p0sDnVbnPLwTlL1cXNGAhrczMAe1jSO27QcKBJQ=";
var Handlebars = require("handlebars");
var Crypto = require("crypto");
var Phone = require('node-phonenumber');

var allowCrossDomain = function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
	res.header('Access-Control-Allow-Headers', 'Content-Type,apiKey,appId,adminKey,userId,token');

	next();
};
exports.allowCrossDomain = allowCrossDomain;

var logRequest = function(req, res, next) {
	console.log(req.ip, req.originalUrl);
	next();
};
exports.logRequest = logRequest;

function handleResponse(err, data, res, errCode)
{
	if (err)
	{
		if (!errCode)
		{
			errCode = 500;
		}
		res.status(errCode).json({"error": err});
	}
	else
	{
		if (data)
		{
			if (data.toJSON)
			{
				data = data.toJSON();
			}
			res.status(200).json(data);
		}
		else
		{
			res.status(404).json({"error": "Item not found"});
		}
	}
}
exports.handleResponse = handleResponse;

exports.handleWhoops = function(res)
{
	res.send("Whoops!");
}

exports.getToken = function()
{
	return Math.random() * 9999999;
}

exports.stringExchange = function(template, vars)
{
	var hb = Handlebars.compile( template );
	return hb(vars);
}

function encrypt(text){
	var cipher = Crypto.createCipher('aes-256-cbc', SECRET);
	var crypted = cipher.update(text,'utf8','hex');
	crypted += cipher.final('hex');
	return crypted;
}
exports.encrypt = encrypt;

function decrypt(text){
	//console.log("About to decrypt", text, SECRET);
	try
	{
		if (text === null || typeof text === 'undefined') {console.log("No text");return text;};
		var decipher = Crypto.createDecipher('aes-256-cbc', SECRET);
		var dec = decipher.update(text,'hex','utf8');
		dec += decipher.final('utf8');
		return dec;
	}
	catch (e)
	{
		console.log('Utils.decrypt:',e);
		return text;
	}

}
exports.decrypt = decrypt;

function leftStr(s, len)
{
	return s.substring(0, Math.min(s.length,len));
}
exports.leftStr = leftStr;

function normalisePhoneNumber(number, defaultCountry)
{
	var phoneUtil = Phone.PhoneNumberUtil.getInstance();
	var phoneNumber = phoneUtil.parse( number, defaultCountry || 'AU');
	if (phoneNumber)
	{
		var result = phoneUtil.format(phoneNumber, Phone.PhoneNumberFormat.INTERNATIONAL);
		//console.log(result);
		return result;
	}
	else
	{
		return null;
	}

}
exports.normalisePhoneNumber = normalisePhoneNumber;

var Mongoose = require('mongoose');
exports.Mongoose = Mongoose;
//Mongoose.connect('mongodb://66.228.50.213/'+ DB_NAME);
console.log('Connecting to mongo...');
Mongoose.connect('mongodb://localhost/'+ DB_NAME, function(err){if(err)console.error(err); else console.log("Connected OK");});
