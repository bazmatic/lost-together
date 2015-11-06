var Utils = require('./utils.js');
var Contact = require('./contact.js');
var UserLocation = require('./userLocation.js');
var FriendRequest = require('./friendRequest.js');
var Sms = require('./sms.js');
var Async = require('async');
var Timestamps = require('mongoose-timestamp');

var UserSchema = new Utils.Mongoose.Schema(
	{
		"appId": { type: String, required: true, index: true },
		"name": { type: String, required: true },
		"avatar": String,
		"mobile": { type: String, index: true, get: Utils.decrypt, set: Utils.encrypt},
		"token": { type: String, required: false, index: true },
		"location": { type: Object, required: false },
		"confirmed": { type: Boolean, default: false },
	},
	{
		//Handle output saved to DB
		toObject: {
			"virtuals": false,
			"transform": function(doc, ret, options)
			{
				delete ret.me;
			}
		},
		//Handle output to API requests
		toJSON: {
			"virtuals": true,
			"getters": true,
			"transform": function(doc, ret, options)
			{
				ret = doc.secure();
			}
		}
	}
);
UserSchema.plugin(Timestamps);

UserSchema.methods.secure = function()
{
	if (this.token) {
		delete this.token;
	}
	if (this.password) {
		delete this.password;
	}
	delete this.appId;
	delete this.confirmed;
	if (this.__v)
	{
		delete this.__v;
	}
	return this;
}

UserSchema.methods.startup = function(finalCallback)
{
	console.log("User.startup()");
	var self = this;
	Async.parallel(
		[
			function _contacts(callback)
			{
				self.getContacts(callback)
			},
			function _sent(callback)
			{
				self.findSentFriendRequests(callback);
			},
			function _received(callback)
			{
				self.findReceivedFriendRequests(callback);
			},
		],
		function(err)
		{
			self.findFriends(finalCallback);			
		}
	);
}

UserSchema.virtual("contacts").get(function()
{
	return this._contacts;
});

UserSchema.virtual("sentFriendRequests").get(function()
{
	return this._sentFriendRequests;
});

UserSchema.virtual("receivedFriendRequests").get(function()
{
	return this._receivedFriendRequests;
});

UserSchema.virtual("friends").get(function()
{
	return this._friends;
});

UserSchema.statics.getById = function(id, callback)
{
	this.find({ "_id": id}, callback);
};

UserSchema.statics.getByMobile = function(mobile, appId, callback)
{
	this.findOne({ "mobile": Utils.encrypt(mobile), "appId": appId }, callback)
};

UserSchema.methods.getContacts = function(callback)
{
	var self = this;
	self._contacts = [];
	Contact.model.findMy(this._id, function(err, contactList)
	{		
		if (contactList)
		{
			self._contacts = contactList;
		}
		callback(err);
	});
};

UserSchema.methods.findReceivedFriendRequests = function(callback)
{
	console.log("User.findReceivedFriendRequests");
	var self = this;
	self._receivedFriendRequests = [];
	FriendRequest.model.findReceived(Utils.encrypt(this.mobile), this.appId, function(err, friendRequests)
	{
		self._receivedFriendRequests = friendRequests;
		callback(err);
	});
};

UserSchema.methods.findSentFriendRequests = function(callback)
{
	console.log("User.findSentFriendRequests");
	var self = this;
	self._sentFriendRequests = [];
	FriendRequest.model.findSent(Utils.encrypt(this.mobile), this.appId, function(err, friendRequests)
	{
		self._sentFriendRequests = friendRequests;
		callback(err);
	});
};

UserSchema.methods.findFriends = function(callback)
{
	console.log("User.findFriends");
	var self = this;
	self._friends = [];

	FriendRequest.model.findFriends(Utils.encrypt(this.mobile), this.appId, function(err, friends)
	{
		self._friends = friends;
		callback(err);
	});
};

var UserModel = Utils.Mongoose.model(
	'User', UserSchema
);

exports.model = UserModel;


function _getById(userId, startup, callback) {
	UserModel.findOne({ "_id": userId }, function(err, data)
	{
		if ((!data) || err)
		{
			callback(err || "Not found");
		}
		else
		{
			var user = data;
			if (startup)
			{
				user.startup(callback)
			}
			else
			{
				callback(null, user);
			}

		}
	});
}
//== Request handling ========================================

function _authUser( req, callback)
{
	var userId = req.get("userId");
	var token = req.get("token");
	var appId = req.get("appId");
	if (userId && token)
	{
		console.log(UserModel.collection.collectionName);
		var q = { "_id": userId, "token": token, "confirmed": true, "appId": appId };
		UserModel.findOne(q,function(err, user)
		{
			if (err)
			{
				console.error(err);
			}
			if (!user)
			{
				callback("Failed to authenticate user");
			}
			else
			{
				user.startup(function(err)
				{
					req.user = user;
					callback(err);
				});

			}
		});
	}
	else
	{
		callback("Missing auth headers");
	}
}

exports.passThrough = function(req, res, next)
{

	_authUser(req, function(err)
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

};

exports.getSelf = function(req, res)
{
	//console.log("getSelf");
	if (req.user)
	{
		Utils.handleResponse(null, req.user, res);
	}
	else
	{
		Utils.handleResponse("Not signed in", null, res, 403);
	}
};

exports.signup = function(req, res)
{
	var user = new UserModel(req.body);
	user.confirmed = false;
	user.token = Utils.getToken();
	//user.mobile = Utils.encrypt(user.mobile);
	user.appId = req.get("appId") || Utils.DEFAULT_APP;
	user.confirmed = false;
	user.save(function(err, data) {
		//This is a new signup, therefore we need to get confirmation back
		if (err)
		{
			console.error(err);
			Utils.handleResponse(err, data, res);
		}
		else
		{
			console.log("Sending SMS to", user.mobile);
			templateData = {
				"user": data,
				"app": req.app,
				"url": "http://" + Utils.DOMAIN + "/confirm/user?userId="+data.id+"&token="+data.token
			};
			var smsText = Utils.stringExchange(req.app.confirmUserText, templateData);
			console.log("SMS text:", smsText);
			Sms.sendSms(
				user.mobile,
				smsText,
				req.app.name,
				function(err, smsData){
					console.log(smsData);

					var result = user.toJSON();
					if (smsData)
					{
						user.message = "Confirmation message sent";
					}

					Utils.handleResponse(err, result, res, 500);
				}
			);
		}
	});
}

exports.confirm = function(req, res)
{
	var query = {"_id": req.query.userId, "token": req.query.token };
	UserModel.findOne(query, function(err, user)
	{
		if (!user)
		{
			Utils.handleResponse("Authentication failed", user, res, 403);
		}
		else if (err)
		{
			Utils.handleResponse(err, user, res);
		}
		else
		{
			user.confirmed = true;
			user.save(function(err, savedData)
			{
				Utils.handleResponse(err, savedData, res);
			});
		}
	});
}

exports.update = function(req, res)
{
	var user = new UserModel(req.body);
	user.update(
		function(err, data)
		{
			Utils.handleResponse(err, data, res);
		}
	);
}

exports.approveFollow = function(req, res)
{

}

//Request to follow a specific user
exports.befriend = function(req, res)
{
	//Get the mobile of the contact
	getById(req.params.userId, function(err, user)
	{
		if (user)
		{
			FriendRequest.send(req.user.mobile, user.mobile, req.app.id, function(err, friendRequest)
			{
				Utils.handleResponse(err, friendRequest, res);
			});
		}
		else
		{
			Utils.handleResponse(err, null, res, 404);
		}
	});
}





