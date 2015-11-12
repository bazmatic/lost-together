var Utils = require('./utils.js');
var User = require('./user.js');
var Timestamps = require('mongoose-timestamp');
var Async = require('async');
var Status =
{
	pending: 'pending',
	approved: 'approved',
	denied: 'denied'
}

var FriendRequestSchema = new Utils.Mongoose.Schema(
	{
		appId: String,
		requesterMobile: {
			type: String,
			index: true,
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
		requestedMobile: {
			type: String,
			index: true,
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
		status: { type: String, default: Status.pending }
	},
	{
		toJSON:
		{
			getters: true,
			transform: function(doc, ret, options)
			{
				delete ret.__v;
			}
		}
	}
);

FriendRequestSchema.plugin(Timestamps);

FriendRequestSchema.methods.fetchRequester = function(callback)
{
	var self = this;

	User.model.getByMobile(self.requesterMobile, self.appId, function(err, user)
	{
		if (user)
		{
			self._requesterUser = user;
		}
		callback(err);
	});
};

FriendRequestSchema.methods.fetchRequested = function(callback)
{
	var self = this;

	User.model.getByMobile(self.requestedMobile, self.appId, function(err, user)
	{
		if (user)
		{
			self._requestedUser = user;
		}
		callback(err);
	});
}

FriendRequestSchema.virtual('requesterUser').get(function()
{
	if (this._requesterUser)
	{
		return this._requesterUser.secure();	
	}
	else {
		return;
	}
});

FriendRequestSchema.virtual('requestedUser').get(function()
{
	if (this._requestedUser)
	{
		return this._requestedUser.secure();		
	}
	else {
		return;
	}
});

FriendRequestSchema.statics.findSent = function(myMobile, appId, finalCallback)
{
	this.find
	(
		{ 
			requesterMobile: Utils.encrypt(myMobile),
			appId: appId
		},
		function(err, sentItems)
		{
			Async.eachSeries
			(
				sentItems,
				function(item, callback)
				{
					item.fetchRequested(callback);	
				},
				finalCallback(err, sentItems)
			);
		}
	);
};

FriendRequestSchema.statics.findReceived = function(myMobile, appId, finalCallback)
{
	this.find
	(
		{ 
			requestedMobile: Utils.encrypt(myMobile),
			appId: appId
		},
		function(err, sentItems)
		{
			Async.eachSeries
			(
				sentItems,
				function(item, callback)
				{
					item.fetchRequester(callback);	
				},
				finalCallback(err, sentItems)
			);
		}
	);
};

FriendRequestSchema.statics.findFriends = function(myMobile, appId, finalCallback)
{
	var friends = [];
	var myMobileEncrypted = Utils.encrypt(myMobile);
	this.find
	(
		{ 
			$or:
			[
				{ 
					requesterMobile: myMobileEncrypted,
				},
				{
					requestedMobile: myMobileEncrypted
				} 
			],
			appId: appId,
			status: Status.approved
		}, 
		function(err, approvedRequests)
		{
			//console.log(err, approvedRequests);
			if (approvedRequests && approvedRequests)
			{
				Async.eachSeries(
					approvedRequests,
					function _getOtherUser(friendRequest, callback)
					{
						var otherMobile = (friendRequest.requestedMobile == myMobile)?friendRequest.requesterMobile:friendRequest.requestedMobile;
						
						User.model.getByMobile(otherMobile, appId, function(err, friend)
						{
							friends.push(friend);
							callback(null);
						});
					},
					function(err)
					{
						finalCallback(err, friends);
					}
				)
			}
			else
			{
				finalCallback(err, friends);
			}
		}
	);
};

FriendRequestSchema.statics.send = function(fromMobile, toMobile, appId, callback)
{
	//Check if there is already one between these users
	this.findOne(
	{ 
		$or: [
			{ 
				requesterMobile: Utils.encrypt(fromMobile),
				requestedMobile: Utils.encrypt(toMobile)
			},
			{
				requesterMobile: Utils.encrypt(toMobile),
				requestedMobile: Utils.encrypt(fromMobile)
			} 
		],
		appId: appId,
		status: Status.pending
	}, 
	function(err, item)
	{
		if (!item && !err)
		{
			var friendRequest = new FriendRequestModel({
				requesterMobile: fromMobile,
				requestedMobile: toMobile,
				appId: appId
			});
			friendRequest.save(callback);
		}
		else
		{
			callback(err, item);
		}
	});
}

FriendRequestSchema.statics.setStatus = function(requestId, user, status, callback)
{
	this.findOneAndUpdate
	(
			{
				_id: requestId,
				requestedMobile: Utils.encrypt(user.mobile)
			},
			{
				$set: { status: Status[status]}
			},
			function(err, data)
			{
				if (data)
				{
					data.status = Status[status];
				}
				callback(err, data);
			}

	);
}

var FriendRequestModel = Utils.Mongoose.model
	(
		"FriendRequest", FriendRequestSchema
	);

exports.model = FriendRequestModel;

//== Request handling ========================================

exports.approve = function(req, res)
{

	FriendRequestModel.setStatus(req.params.id, req.user, Status.approved, function(err, data)
	{
		Utils.handleResponse(err, data, res);
	});
};

exports.unapprove = function(req, res)
{
	FriendRequestModel.setStatus(req.params.id, req.user, Status.pending, function(err, data)
	{
		Utils.handleResponse(err, data, res);
	});
};

/*
exports.deny = function(req, res)
{
	FriendRequestModel.deny(req.params.id, req.user, function(err, data)
	{
		Utils.handleResponse(err, data, res);
	});
};
*/