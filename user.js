var Utils = require('./utils.js');
var App = require('./app.js');
var Contact = require('./contact.js');
var UserLocation = require('./userLocation.js');
var FriendRequest = require('./friendRequest.js');
var Place = require('./place.js');
var Sms = require('./sms.js');
var Async = require('async');
var Timestamps = require('mongoose-timestamp');
var _ = require('underscore');

var UserSchema = new Utils.Mongoose.Schema(
	{
		appId: { type: String, required: true, index: true },
		name: { type: String, required: true },
		avatar: String,
		mobile: {
			type: String,
			index: true,
			required: true,
			get: Utils.decrypt,
			set: function(value)
			{
				value = Utils.encrypt(Utils.normalisePhoneNumber(value));
				return value;
			},
			validate: {
				validator: function(value)
				{
					return Utils.normalisePhoneNumber(Utils.decrypt(value));
				},
				message: "{VALUE} is not a valid phone number"
			}
		},
		token: { type: String, required: false, index: true },
		location: { type: Object, required: false },
		confirmed: { type: Boolean, default: false },
		public: { type: Boolean, default: false }
	},
	{
		//Handle output saved to DB
		toObject: {
			virtuals: false,
			transform: function(doc, ret, options)
			{
				delete ret.me;
			}
		},
		//Handle output to API requests
		toJSON: {
			virtuals: true,
			getters: true,
			transform: function(doc, ret, options)
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
	var self = this;
	Async.parallel(
		[
			/*function _contacts(callback)
			{
				self.getContacts(callback)
			},*/
			function _userContacts(callback)
			{
				self.getUserContacts(callback)
			},
			function _sent(callback)
			{
				self.findSentFriendRequests(callback);
			},
			function _received(callback)
			{
				self.findReceivedFriendRequests(callback);
			}
		],
		function(err)
		{
			self.findFriends(finalCallback);			
		}
	);
}

UserSchema.virtual('userContacts').get(function()
{
	return this._userContacts;
});

UserSchema.virtual('sentFriendRequests').get(function()
{
	return this._sentFriendRequests;
});

UserSchema.virtual('receivedFriendRequests').get(function()
{
	return this._receivedFriendRequests;
});

UserSchema.virtual('friends').get(function()
{
	return this._friends;
});

/*
UserSchema.virtual('allItems').get(function()
{
	var friends = _map(this._friends, function(item){ item.toJSON().type = "friend"});
	var userContacts = _map(this._friends, function(item){ item.toJSON().type = "contact"});
	var all = friends.concat(userContacts);
	return all;
});
*/

UserSchema.statics.getById = function(id, callback)
{
	this.find({ "_id": id}, callback);
};

UserSchema.statics.getByMobile = function(mobile, appId, callback)
{
	this.findOne({ "mobile": Utils.encrypt(mobile), "appId": appId }, callback)
};

UserSchema.statics.getAll = function(appId, callback)
{
	this.find({ "appId": appId }, callback);
}

UserSchema.statics.findPublic = function(appId, callback)
{
	this.find({ "appId": appId, "public": true }, function(err, data)
	{
		callback(err, data);
	});
}

/*
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
*/

UserSchema.methods.getUserContacts = function(callback)
{
	var self = this;
	self._userContacts = [];
	Contact.model.findMyUsers(this._id, function(err, userList)
	{
		if (userList)
		{
			self._userContacts = userList;
		}
		callback(err);
	});
};

UserSchema.methods.findReceivedFriendRequests = function(callback)
{
	console.log('User.findReceivedFriendRequests');
	var self = this;
	self._receivedFriendRequests = [];
	FriendRequest.model.findReceived(this.mobile, this.appId, function(err, friendRequests)
	{
		self._receivedFriendRequests = friendRequests;
		callback(err);
	});
};

UserSchema.methods.findSentFriendRequests = function(callback)
{
	console.log('User.findSentFriendRequests');
	var self = this;
	self._sentFriendRequests = [];
	FriendRequest.model.findSent(this.mobile, this.appId, function(err, friendRequests)
	{
		self._sentFriendRequests = friendRequests;
		callback(err);
	});
};

UserSchema.methods.findFriends = function(callback)
{
	console.log('User.findFriends');
	var self = this;
	self._friends = [];

	FriendRequest.model.findFriends(this.mobile, this.appId, function(err, friends)
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
			callback(err || 'Not found');
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
	var userId = req.get('userId');
	var token = req.get('token');
	var appId = req.get('appId');
	if (userId && token)
	{
		var q = { '_id': userId, 'token': token, 'confirmed': true, 'appId': appId };
		UserModel.findOne(q,function(err, user)
		{
			if (err)
			{
				console.error(err);
			}
			if (!user)
			{
				callback('Failed to authenticate user');
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
		callback('Missing auth headers');
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

exports.adminPassThrough = function(req, res, next)
{
	_authAdminUser(req, function(err)
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
		Utils.handleResponse('Not signed in', null, res, 403);
	}
};


exports.signup = function(req, res)
{
	var user = new UserModel(req.body);
	user.confirmed = false;
	user.token = Utils.getToken();
	//user.mobile = Utils.encrypt(user.mobile);
	user.appId = req.get('appId') || Utils.DEFAULT_APP;
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
			console.log('Sending SMS to', user.mobile);
			templateData = {
				user: data,
				app: req.app,
				link: 'http://' + Utils.DOMAIN + ':' + Utils.PORT + '/confirm/user?userId='+data.id+'&token='+data.token
			};

			var smsText = Utils.stringExchange(req.app.confirmUserText, templateData);
			Sms.sendSms(
				user.mobile,
				smsText,
				req.app.name,
				function(err, smsData){
					console.log(smsData);

					var result = user.toJSON();
					if (smsData)
					{
						result.message = 'Confirmation message sent';
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
				if (err)
				{
					Utils.handleWhoops(res);
				}
				else {
					App.model.findOne(user.appId, function(err, app)
					{
						if (err || !app)
						{
							Utils.handleWhoops(res);
						}
						else
						{
							res.redirect(app.afterConfirmUserUrl);
						}
					});

				}

			});
		}
	});
}

exports.update = function(req, res)
{
	var user = new UserModel(req.body);
	UserModel.findOneAndUpdate({ _id: user._id }, user, function(err, data)
		{
			Utils.handleResponse(err, user, res);
		}
	);
}

exports.getAll = function(req, res)
{
	UserModel.getAll(
		req.app.id,
		function(err, users)
		{
			Utils.handleResponse(err, users, res);
		}
	);
}

//Request to follow a specific user
exports.befriend = function(req, res)
{
	//Get the mobile
	UserModel.getById(req.params.userId, function(err, user)
	{
		if (user)
		{
			FriendRequest.model.send(req.user.mobile, user.mobile, req.app.id, function(err, friendRequest)
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

//Request to follow a specific mobile number
exports.befriendMobile = function(req, res)
{
	FriendRequest.model.send(req.user.mobile, req.params.number, req.app.id, function(err, friendRequest)
	{
		Utils.handleResponse(err, friendRequest, res);
	});
}

exports.getAllowedLocations = function(req, res)
{
	var result = {
		friends: [],
		places: [],
		publicUsers: []
	};
	var tags = null;
	if (req.user.friends)
	{
		result.friends = req.user.friends;
	}
	if (req.params.tags)
	{
		//TODO: Turn into array
		tags = req.params.tags.split(',');
		tags = null; //TODO
	}
	Async.parallel(
		[
			function _places(callback)
			{
				Place.model.findByTags(req.app.id, tags, function(err, data)
				{
					result.places = data;
					callback(err);
				});
			},
			function _publicUsers(callback)
			{
				UserModel.findPublic(req.app.id, function(err, data)
				{
					if (data && data.constructor == Array)
					{
						result.publicUsers = _.filter(data,	function(item){	return item.location }); //Only display users with a location
					}
					callback(err);
				});
			}
		],
		function(err)
		{
			Utils.handleResponse(err, result, res);
		}

	)



}



