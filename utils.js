exports.DEFAULT_APP = "frendl";
exports.DOMAIN = "66.228.50.213";
var SECRET = "vaU1p0sDnVbnPLwTlL1cXNGAhrczMAe1jSO27QcKBJQ=";
var Handlebars = require("handlebars");
var Crypto = require("crypto");


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

exports.whoopsPage = function(req, res)
{
	res.send("Whoops!");
}

exports.welcomePage = function(req, res)
{
	res.send("Welcome!");
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
	//console.trace("Encrypting", text);

	var cipher = Crypto.createCipher('aes-256-cbc', SECRET);
	var crypted = cipher.update(text,'utf8','hex');
	crypted += cipher.final('hex');
	return crypted;
}
exports.encrypt = encrypt;

function decrypt(text){
	//console.log("Decrypting", text);
	if (text === null || typeof text === 'undefined') {return text;};
	var decipher = Crypto.createDecipher('aes-256-cbc', SECRET);
	var dec = decipher.update(text,'hex','utf8');
	dec += decipher.final('utf8');
	return dec;
}
exports.decrypt = decrypt;


var Mongoose = require('mongoose');
exports.Mongoose = Mongoose;
Mongoose.connect('mongodb://localhost/lost-together');