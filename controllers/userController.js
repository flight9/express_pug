var User = require('../models/user');

var async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// ZM: Middleware to protect private page
exports.check_auth = function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/user/login');
  }
}

// Display list of all Authors.
exports.user_list = function(req, res, next) {
  User.find()
    .sort([['username', 'descending']])
    .exec(function (err, list_users) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('user_list', { title: 'User List', user_list: list_users });
    });
};

// ZM: Display User login form on GET.
exports.user_login_get = function(req, res, next) {
  res.render('user_login', { title: 'Login'});
};

// ZM: help function to auth user
function authenticate(name, pass, callback) {
  User.findOne({ uasername: name })
    .exec(function (err, user) {
      if (err) { return callback(err); } 
      else if (!user) {
        var err = new Error('User not found.');
        err.status = 401;
        return callback(err);
      }
      bcrypt.compare(pass, user.password, function (err, result) {
        if (result === true) {
          return callback(null, user);
        } else {
          var err = new Error('Invalid username or password.');
          err.status = 401;
          return callback(err);
        }
      })
    });
}

// ZM: Handle User login on POST.
exports.user_login_post = function(req, res, next) {
  authenticate(req.body.username, req.body.password, function(err, user){
    if (err) { return next(err); }
    req.session.user = user;
    res.redirect('/user/detail');
  });
}

// Display User create form on GET.
exports.user_create_get = function(req, res, next) {
  res.render('user_form', { title: 'Create User'});
};

// Handle User create on POST.
exports.user_create_post = [
  // Validate fields.
  body('username').isLength({ min: 4 }).trim().withMessage('User name length must be more than 4.')
    .isAlphanumeric().withMessage('User name has non-alphanumeric characters.'),
  body('password').isLength({ min: 4 }).trim().withMessage('Password length must be more than 4.')
    .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
  // TODO: to valide email

  // Sanitize fields.
  sanitizeBody('username').trim().escape(),
  sanitizeBody('password').trim().escape(),
  sanitizeBody('email').trim().escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/errors messages.
      res.render('user_form', { title: 'Create User', user: req.body, errors: errors.array() });
      return;
    }
    else {
      // Data from form is valid.
      var user = new User({
        username: req.body.username,
        password: req.body.password,
        email: req.body.email
      });
      user.save(function (err) {
        if (err) { return next(err); }
        // Successful - redirect to new record.
        res.redirect(user.url);
      });
    }
  }
];
