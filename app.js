var Utils = require('./utils.js');


var AppSchema = new Utils.Mongoose.Schema({
	"name": String,
	"description": String,
	"password": String, //encrypted
	"createdByIp": { type: String, required: false },
	"createdByName": { type: String, required: true },
	"createdByEmail": { type: String, required: true },
	"apiKey": { type: String, default: null, index: true },
	"confirmUserText": {
		type: String,
		default: "Hello from {{app.name}}! Click on this link to confirm your account: {{link}}"
	},
	"confirmFollowText": {
		type: String,
		default: "Hi! I'd like to track your location with {{app.name}} Click on this link to let me see where you are! Cheers, {{name}} {{link}}"
	},
	"installUrl": {
		type: String,
		required: true
	}
});

var AppModel = Utils.Mongoose.model(
	'App', AppSchema
);

exports.model = AppModel;
exports.post = function(req, res)
{
	var self = this;
	var app = new AppModel(req.body);
	app.apiKey = makeApiKey();
	app.createdByIp = req.connection.remoteAddress;
	app.save(function(err, data) {
		Utils.handleResponse(err, data, res);
	});
};

exports.getOne = function(req, res)
{
	Utils.handleResponse(err, req.app, res)
};


function _authApp(req, callback)
{
	var appId = req.get("appId");
	var apiKey = req.get("apiKey");
	AppModel.findOne({ "_id": appId, "apiKey": apiKey}, function(err, data)
	{
		if (!data)
		{
			callback("Failed to authenticate API key");
		}
		else
		{
			req.app = data;
			callback(err, data);

		}
	})
}

exports.passThrough = function(req, res, next)
{
	_authApp(req, function(err, data)
	{
		if (err)
		{
			Utils.handleResponse(err, null, res, 403);
		}
		else
		{
			next();
		}

	});
}

function makeApiKey()
{
	return (new Utils.Mongoose.Types.ObjectId).toString();
}



