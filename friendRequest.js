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
		requesterMobile: { type: String, index: true, get: Utils.decrypt, set: Utils.encrypt},
		requestedMobile: { type: String, index: true, get: Utils.decrypt, set: Utils.encrypt},
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

//FriendRequestSchema.plugin(Timestamps);

FriendRequestSchema.statics.findSent = function(myMobile, appId, callback)
{
	this.find(
		{ 
			requesterMobile: myMobile,
			appId: appId
		},
		callback
	);
};

FriendRequestSchema.statics.findReceived = function(myMobile, appId, callback)
{
	this.find(
		{ 
			requestedMobile: myMobile,
			appId: appId
		},
		callback
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

FriendRequestSchema.statics.approve = function(requestId, user, callback)
{
	this.findOneAndUpdate
	(
		{
			_id: requestId,
			requestedMobile: Utils.encrypt(user.mobile)
		},
		{
			$set: { status: Status.approved}
		},
		function(err, data)
		{
			if (data)
			{
				data.status = Status.approved;
			}
			callback(err, data);
		}

	);
};

FriendRequestSchema.methods.deny = function(requestId, user, callback)
{
	this.findOneAndUpdate
	(
		{
			_id: requestId,
			requestedMobile: Utils.encrypt(user.mobile)
		},
		{
			$set: { status: Status.denied}
		},
		callback
	);
};

var FriendRequestModel = Utils.Mongoose.model
	(
		"FriendRequest", FriendRequestSchema
	);

exports.model = FriendRequestModel;

//== Request handling ========================================

exports.approve = function(req, res)
{

	FriendRequestModel.approve(req.params.id, req.user, function(err, data)
	{
		Utils.handleResponse(err, data, res);
	});
};

exports.deny = function(req, res)
{
	FriendRequestModel.deny(req.params.id, req.user, function(err, data)
	{
		Utils.handleResponse(err, data, res);
	});
};