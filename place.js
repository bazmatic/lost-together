
var Utils = require('./utils.js');

var PlaceSchema = new Utils.Mongoose.Schema({
	"app": String,
	"userId": { type: String, required: false },
	"tags": Array, //eg venue, vehicle, etc
	"name": String,
	"mobile": { type: String, required: false },
	"avatar": String,
	"lat": {type: Number, required: true},
	"long": {type: Number, required: true},
	"altitude": {type: Number, default: 0 }
});
PlaceSchema.plugin(Timestamps);



var PlaceModel = Utils.Mongoose.model(
	'Place', PlaceSchema
);

exports.model = PlaceSchema;

//== Request handling ========================================

exports.save = function(req, res)
{

};
