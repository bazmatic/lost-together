var Express = require('express');
var Http = require('http');
//var QueryString = require('querystring');
var BodyParser = require('body-parser');

var Utils = require('./utils.js');
var User = require('./user.js');
var Contact = require('./contact.js');
var FriendRequest = require('./friendRequest.js');
var UserLocation = require('./userLocation.js');
var Place = require('./place.js');
var App = require('./app.js');

//=== App
var app = Express();
app.use(BodyParser.json());
app.use(Utils.allowCrossDomain);
app.use(Utils.logRequest);

app.set('port', Utils.PORT);

app.get('/', function(req, res)
{
	res.status(200).send("Lost Together 0.1");
});

app.get('/', function(req, res)
{
	res.send('Lost Together v0.1');
});

//== User
app.post('/user', App.passThrough, User.signup);
app.put('/user', App.passThrough, User.passThrough,  User.update);
app.get('/user', App.passThrough, User.passThrough, User.getSelf);
app.get('/users', App.adminPassThrough, User.passThrough, User.getAll);
app.put('/user/:id', App.adminPassThrough, User.passThrough, User.update);

//app.delete('/user', User.auth, User.delete);
app.get('/confirm/user', User.confirm);

//== Locations
app.post('/location', App.passThrough, User.passThrough, UserLocation.add);
app.get('/locations', App.passThrough, User.passThrough, User.getAllowedLocations);

//== Contacts
app.post('/contact', App.passThrough, User.passThrough, Contact.add); //one or many
app.put('/contact', App.passThrough, User.passThrough, Contact.update);
app.get('/contact/:id', App.passThrough, User.passThrough, Contact.get);
app.get('/contacts', App.passThrough, User.passThrough, Contact.get);

//== Friends
app.get('/befriend/contact/:contactId', App.passThrough, User.passThrough, Contact.befriend);
app.get('/befriend/user/:userId', App.passThrough, User.passThrough, User.befriend);
app.get('/befriend/mobile/:number', App.passThrough, User.passThrough, User.befriendMobile);
app.get('/befriend/approve/:id', App.passThrough, User.passThrough, FriendRequest.approve);
app.get('/befriend/unapprove/:id', App.passThrough, User.passThrough, FriendRequest.unapprove);

//== Apps
app.post('/app', App.post);
app.put('/app', App.passThrough, App.post);
app.get('/app/:id', App.passThrough, App.get);

//== Place
app.post('/place', App.adminPassThrough, User.passThrough, Place.add);
app.put('/place', App.adminPassThrough, User.passThrough, Place.update);
app.get('/place/:id', App.adminPassThrough, User.passThrough, Place.get);
app.get('/place', App.adminPassThrough, User.passThrough, Place.get);
app.delete('/place/:id', User.adminPassThrough, User.passThrough, Place.delete);

//Start server
Http.createServer(app).listen(process.env.PORT, process.env.IP, function(){
	console.log('Web service listening at', process.env.IP, 'on port', process.env.PORT);
});

//Exception safety net
process.on('uncaughtException', function(err) {
	// handle the error safely
	console.log("SAFETY NET", err.stack);
});

