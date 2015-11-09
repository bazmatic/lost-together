
var Utils = require('./utils.js');
var Timestamps = require('mongoose-timestamp');

var PlaceSchema = new Utils.Mongoose.Schema({
	"appId":  { type: String, required: true },
	"tags": Array, //eg venue, vehicle, etc
	"name": String,
	"avatar": String,
	"lat": { type: Number, required: true},
	"long": { type: Number, required: true},
	"altitude": { type: Number, default: 0 },
	"createdBy": { type: String, required: false }, //TODO: Make these secure
	"modifiedBy": { type: String, required: false } //TODO: Make these secure
});
PlaceSchema.plugin(Timestamps);

PlaceSchema.statics.findByTags = function(appId, tags, callback)
{
	var q = {
		appId: appId
	}
	if (tags && tags.length)
	{
		q.tags = { $in: tags};
	}
	this.find(q, callback);
};

var PlaceModel = Utils.Mongoose.model(
	'Place', PlaceSchema
);

exports.model = PlaceModel;

//== Request handling ========================================

exports.add = function(req, res)
{
	req.body.createdBy = req.user.id;
	req.body.modifiedBy = req.user.id;
	var place = new PlaceModel(req.body);
	place.save(
			function(err, data)
			{
				Utils.handleResponse(err, data, res);
			}
	);
};

exports.update = function(req, res)
{
	req.body.modifiedBy = req.user.id;
	var place = new PlaceModel(req.body);
	place.update(
		function(err, data)
		{
			Utils.handleResponse(err, data, res);
		}
	);
}

exports.get = function(req, res)
{
	if (req.params.id)
	{
		PlaceModel.findOne({appId: req.app.id, _id: req.params.id}, function(err, data)
		{
			Utils.handleResponse(err, data, res);
		});
	}
	else
	{
		PlaceModel.find(req.app.id, function(err, data)
		{
			Utils.handleResponse(err, data, res);
		});
	}
};

exports.delete = function(req, res)
{
	PlaceModel.remove({appId: req.app.id, _id: req.params.id}, function(err, data)
	{
		Utils.handleResponse(err, data, res);
	});
};


