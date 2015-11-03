var Utils = require('./utils.js');

var UserLocationSchema = new Utils.Mongoose.Schema({
	"userId": String,
	"lat": {type: Number, required: true},
	"long": {type: Number, required: true},
	"altitude": {type: Number, default: 0 },
	"accuracy": {type: Number, default: 0},
	"altitudeAccuracy": {type: Number, default: 0},
	"heading": {type: Number, default: 0},
	"speed": {type: Number, default: 0},
	"timestamp": { type: Date, default: Date.now }
});


UserLocationSchema.statics.getHistory = function(userId, callback)
{
	this.find({userId: userId}, null, {sort: {timestamp:-1}}, callback);
};

UserLocationSchema.statics.getCurrentLocation = function(userId, callback)
{
	this.findOne({userId: userId}, null, {sort: {timestamp:-1}}, function(err, location)
	{
		if (typeof(location) === "undefined")
		{
			location = null;
		}
		callback(err, location);
	})
}

var UserLocationModel = Utils.Mongoose.model(
	'UserLocation', UserLocationSchema
);

exports.model = UserLocationModel;

//== Request handling ========================================

exports.add = function(req, res)
{
	req.body.userId = req.user.id;
	var location = new UserLocationModel(req.body);
	req.user.location = location;
	req.user.save();
	location.save(
		function(err, data)
		{
			Utils.handleResponse(err, data, res);
		}
	);
};
