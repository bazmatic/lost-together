var Utils = require('./utils.js');


var AppSchema = new Utils.Mongoose.Schema({
	"name": String,
	"description": String,
	"password": String, //encrypted
	"createdByIp": { type: String, required: false },
	"createdByName": { type: String, required: true },
	"createdByEmail": { type: String, required: true },
	"apiKey": { type: String, default: null, index: true }, //TODO: Change to array
	"adminKey": { type: String, required: false },
	"confirmUserText": {
		type: String,
		default: "Hello from {{app.name}}! Click on this link to confirm your account: {{{link}}}"
	},
	"confirmFollowText": {
		type: String,
		default: "Hi! I'd like to track your location with {{app.name}} Click on this link to let me see where you are! Cheers, {{name}} {{{link}}}"
	},
	"installUrl": {
		type: String,
		required: true
	},
	"afterConfirmUserUrl": {
		type: String,
		default: "http://www.woodfordfolkfestival.com.au"
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

exports.get = function(req, res)
{
	Utils.handleResponse(err, req.app, res)
};


function authApp(req, callback)
{
	var appId = req.get("appId");
	var q =
	{
		_id: appId
	};
	if (req.get("adminKey"))
	{
		q.adminKey = req.get("adminKey");
	}
	else {
		q.apiKey = req.get("apiKey");
	}
	AppModel.findOne(q, function(err, data)
	{
		if (!data)
		{
			callback("Failed to authenticate API key");
		}
		else
		{
			if (data)
			{
				req.app = data;
				if (q.adminKey)
				{
					req.admin = true;
				}
			}
			callback(err, data);
		}
	})
}
exports.authApp = authApp;

exports.passThrough = function(req, res, next)
{
	authApp(req, function(err, data)
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

exports.adminPassThrough = function(req, res, next)
{
	authApp(req, function(err, data)
	{
		if (!req.admin)
		{
			err = "Not authorised to perform this function."
		}
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



