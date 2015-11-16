var Utils = require('./utils.js');
var User = require('./user.js');
var FriendRequest = require('./friendRequest.js');
var Sms = require('./sms.js');
//var Encrypt = require('mongoose-encryption');
var Async = require('async');
var _ = require('underscore');
var Timestamps = require('mongoose-timestamp');

var ContactSchema = new Utils.Mongoose.Schema(
	{
		"appId": String,
		"ownerId": String,
		"name": String,
		"mobile":
		{
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
		}
	},
	{
		"toJSON":
		{
			"getters": false,
			"transform": function(doc, ret, options)
			{
				delete ret.ownerId;
				delete ret.appId;
				delete ret.__v;
			}
		}
	}
);

ContactSchema.plugin(Timestamps);

ContactSchema.statics.getMyById = function(myId, contactId, callback)
{
	var q = { "_id": contactId, "ownerId": myId };
	this.findOne(q, callback);
};

ContactSchema.statics.findMyByMobile = function(mobile, ownerId, callback)
{
	this.findOne({ "mobile": mobile, "ownerId": ownerId }, callback)
};

ContactSchema.statics.findByMobile = function(mobile, callback)
{
	var q = { "mobile": Utils.encrypt(mobile) };
	console.log("Contact.findByMobile()", q);
	this.find(q, callback);

};

ContactSchema.statics.findMy = function(ownerId, callback)
{
	this.find({ "ownerId": ownerId }, callback);
};

ContactSchema.statics.findMyUsers = function(ownerId, callback)
{
	this.find({ "ownerId": ownerId }, function(err, contacts)
	{	
		var mobileList = _.pluck(contacts, 'mobile').map(Utils.encrypt);
		
		User.model.find({ mobile: {$in: mobileList}}, function(err, users)
		{
			if (users)
			{
				//Ensure the owner is not included in the results
				
				var result = _.filter(users, function(user)
				{
					return (user._id !== ownerId)	
				});
				callback(err, result);
			
			}
			else
			{
				callback(err);
			}
		});
	});
};

ContactSchema.methods.friendRequest = function()
{
	FriendRequest.model.save()
};


var ContactModel = Utils.Mongoose.model(
	'Contact', ContactSchema
);

exports.model = ContactModel;

//== Request handling ========================================

//Add one or many Contacts
exports.add = function(req, res)
{
	var results = [];
	var lastError;
	var contacts;
	if (typeof(req.body) === "object")
	{
		if (req.body.constructor === Array)
		{
			contacts = req.body;
		}
		else
		{
			contacts = [ req.body ];
		}

		Async.each(
			contacts,
			function(contactData, callback)
			{
				try {
					contactData.ownerId = req.user.id;
					contactData.appId = req.app.id;
					var contact = new ContactModel(contactData);
					results.push(contact);
					contact.save(function(err)
					{
						if (err)
						{
							console.log("Error adding Contact:", err);
							contact.error = err;
						}
						callback(null);
					});
				}
				catch(e)
				{
					console.log("Error adding Contact:", e);
					contact.error = e;
				}

			},
			function(err)
			{
				Utils.handleResponse(err, results, res);
			}
		);
	}
};

exports.update = function(req, res)
{
	req.body.ownerId = req.user.id;
	req.body.appId = req.app.id;
	var contact = new ContactModel(req.body);
	contact.update(
		function(err, data)
		{
			Utils.handleResponse(err, data, res);
		}
	);
};

exports.get = function(req, res)
{
	if (req.params.id)
	{
		ContactModel.findOne({appId: req.app.id, ownerId: req.user.id, _id: req.params.id}, function(err, data)
		{
			Utils.handleResponse(err, data, res);
		});
	}
	else
	{
		ContactModel.findMy(req.user.id, function(err, data)
		{
			Utils.handleResponse(err, data, res);
		});
	}
};

exports.befriend = function(req, res)
{
	//Get the mobile of the contact
	console.log("Contact.befriend");
	ContactModel.getMyById(req.user.id, req.params.contactId, function(err, contact)
	{
		if (contact)
		{
			console.log(FriendRequest.model.sen);
			FriendRequest.model.send(req.user.mobile, contact.mobile, req.app.id, function(err, friendRequest)
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
