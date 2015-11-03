var Express = require('express');
var Http = require('http');
//var QueryString = require('querystring');
var BodyParser = require('body-parser');

var Utils = require('./utils.js');
var User = require('./user.js');
var Contact = require('./contact.js');
var FriendRequest = require('./friendRequest.js');
var UserLocation = require('./userLocation.js');
var App = require('./app.js');


var PORT = "3001"; //PERS

//=== App
var app = Express();
app.use(BodyParser.json());

app.set('port', PORT);

app.get('/', function(req, res)
{
	res.status(200).send("Lost Together 0.1");
});

app.post('/user', App.passThrough, User.signup);
app.put('/user', User.passThrough, App.passThrough, User.update);
app.get('/user', User.passThrough, App.passThrough, User.getSelf)
//app.delete('/user', User.auth, User.delete);
app.get('/confirm/user', User.confirm);

app.post('/location', User.passThrough, App.passThrough, UserLocation.add);

app.post('/contact', User.passThrough, App.passThrough, Contact.add); //one or many
app.put('/contact', User.passThrough, App.passThrough, Contact.update);

app.get('/befriend/contact/:contactId', User.passThrough, App.passThrough, Contact.befriend);
app.get('/befriend/user/:userId', User.passThrough, App.passThrough, User.befriend);
app.get('/befriend/approve/:id', User.passThrough, App.passThrough, FriendRequest.approve);

app.post('/app', App.post);
app.put('/app', App.passThrough, App.post);
app.get('/app/:id', App.passThrough, App.getOne);

//app.post('/app/place', User.adminAuth, Place.save);
//app.get('/app/place/:id', User.adminAuth, Place.getOne);
//app.get('/app/place', User.adminAuth, Place.list);
//app.delete('/app/place/:id', User.adminAuth, Place.deleteOne);


//Start server
Http.createServer(app).listen(PORT, function(){
	console.log('Web service listening on port ' + app.get('port'));
});

//Exception safety net
process.on('uncaughtException', function(err) {
	// handle the error safely
	console.log("SAFETY NET", err.stack);
});
