var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var index = require('./routes/index');
var users = require('./routes/users');
var catalog = require('./routes/catalog'); // ZM: Import routes for "catalog" area of site

var app = express();

// ZM: Set up mongoose connection
var mongoose = require('mongoose');
var dbURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1/express_pug'
//heroku config:set MONGODB_URI=mongodb://root:root1234@ds251588.mlab.com:51588/sandbox
mongoose.connect(dbURI);
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.on('connected', function () {  
  console.log('Mongoose default connection open to ' + dbURI);
});

// ZM: use sessions for tracking logins
app.use(session({
  secret: 'zm work hard',
  resave: true,
  saveUninitialized: false
}));

// ZM: give templates access to session variables
app.use(function(req, res, next){
  res.locals.session = req.session;
  next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);
app.use('/catalog', catalog);  // ZM: Add catalog routes to middleware chain.

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
