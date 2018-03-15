var bcrypt  = require('bcrypt');
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
    req.session.last_url = req.originalUrl;
    res.redirect('/users/login');
  }
};

// ZM: Display User login form on GET.
exports.user_login_get = function(req, res, next) {
  res.render('user_login', { title: 'Login'});
};

// ZM: help function to auth user
function authenticate(name, pass, callback) {
  User.findOne({ username: name })
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
    if( req.session.last_url) {
      res.redirect(req.session.last_url);
    }
    else {
      res.redirect('/');
    }
  });
}

// ZM: Handle user logout
exports.user_logout = function(req, res, next) {
  if (req.session.user) {
    // ALTERNATIVE 1
    // req.session.user = null;
    // res.redirect('/');
    // ALTERNATIVE 2: delete session object
    req.session.destroy(function(err) {
      if(err) { return next(err); } 
      else {
        return res.redirect('/');
      }
    });
  }
  else {
    var err = new Error('Err: You should login first.');
    err.status = 401;
    next(err);
  }
}

// Display User create form on GET.
exports.user_create_get = function(req, res, next) {
  res.render('user_form', { title: 'Signup'});
};

// Valid rules
var bodyUsername = body('username').isLength({ min: 4 }).trim().withMessage('User name length must be more than 4.')
  .isAlphanumeric().withMessage('User name has non-alphanumeric characters.');
var bodyPassword = body('password').isLength({ min: 4 }).trim().withMessage('Password length must be more than 4.')
  .isAlphanumeric().withMessage('Password name has non-alphanumeric characters.');
var bodyPasswdConfirm = body('password2', 'Confirm Password field must have the same value as the password field')
    .exists().custom((value, { req }) => value === req.body.password);
var bodyEmail = body('email').trim().isEmail().withMessage('Email is not an available email.');
var bodyMobile = body('mobile').trim().isMobilePhone('zh-CN').withMessage('Mobile is not a valid mobile number.');

// Handle User create on POST.
exports.user_create_post = [
  // Validate fields.
  bodyUsername,
  bodyPassword,
  bodyPasswdConfirm,
  bodyEmail,
  bodyMobile,

  // Sanitize fields.
  sanitizeBody('username').trim().escape(),
  sanitizeBody('password').trim().escape(),
  sanitizeBody('email').trim().normalizeEmail(),
  sanitizeBody('mobile').trim().escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/errors messages.
      res.render('user_form', { title: 'Signup', user: req.body, errors: errors.array() });
      return;
    }
    else {
      // Data from form is valid.
      var user = new User({
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        mobile: req.body.mobile
      });
      user.save(function (err) {
        if (err) { return next(err); }
        // Successful - redirect to new record.
        res.redirect('/users/login');
      });
    }
  }
];


// Display list of all Users.
exports.user_list = function(req, res, next) {
  User.find()
  .sort([['createdAt', 'descending']])
  .exec(function (err, list_users) {
    if (err) { return next(err); }
    //Successful, so render
    res.render('user_list', { title: 'User List', user_list: list_users });
  });
};

// Display detail page for a specific User.
exports.user_detail = function(req, res, next) {
  User.findById(req.params.id)
  .exec(function(err, user) {
		if (err) { return next(err); }
		if (user==null) { // No results.
				var err = new Error('User not found');
				err.status = 404;
				return next(err);
		}
		// Successful, so render.
		res.render('user_detail', { title: 'User Detail', user } );
	});
};

// Display User update form on GET.
exports.user_update_get = function(req, res, next) {
  User.findById(req.params.id)
  .exec(function(err, results) {
    if (err) { return next(err); } 
		if (results==null) { // No results.
      var err = new Error('User not found');
      err.status = 404;
      return next(err);
		}
		// Successful, so render.
		res.render('user_form', { title: 'Update User', user: results, updating: true });
  });
};

var bodyPasswordExist = body('password0').isLength({ min: 4 }).trim().withMessage('Existing Password length must be more than 4.');

// Handle User update on POST.
exports.user_update_post = [
  // Validate fields.
  bodyPasswordExist,
  bodyUsername,
  bodyPassword.optional({ checkFalsy: true }),
  bodyPasswdConfirm.optional({ checkFalsy: true }),
  bodyEmail,
  bodyMobile,

  // Sanitize fields.
  sanitizeBody('username').trim().escape(),
  sanitizeBody('password0').trim().escape(),
  sanitizeBody('password').trim().escape(),
  sanitizeBody('email').trim().escape(),
  sanitizeBody('mobile').trim().escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/errors messages.
      res.render('user_form', { title: 'Update User', user: req.body, updating: true, errors: errors.array() });
      return;
    }
    else {
      // Data from form is valid.
      // Authenticate again
      authenticate(req.body.username, req.body.password0, function(err, user){
        if (err) { return next(err); }
        
        // Update after authenticated
        User.findById(req.body._id, function (err, user) {
          if(err) { return next(err); }
          if(user == null) {
            var err = new Error('Err: User not found!');
            err.status = 404;
            return next(err);
          }
          user.email = req.body.email;
          user.mobile = req.body.mobile;
          if(req.body.password) {
            // If new password then update it
            user.password = req.body.password;
          }
          //user.password = req.body.newpassword;
          user.save(function (err, updatedUser) {
            if (err) { return next(err); }
            res.redirect(updatedUser.url);
          });
        });
      });
    }
  }
];

// Display User delete form on GET.
exports.user_delete_get = function(req, res, next) {
  User.findById(req.params.id)
	.exec( function(err, results) {
		if (err) { return next(err); }
		if (results==null) { // No results.
      res.redirect('/users');
		}
		// Successful, so render.
		res.render('user_delete', { title: 'Delete User', user: results } );
	});
};

// Handle Author delete on POST.
exports.user_delete_post = function(req, res, next) {
  // ZM: Check if it is myself
  if(req.session.user && req.session.user._id.toString() == req.body.userid) {
    var err = new Error('Err: You cant delete the account of yourself!');
    err.status = 403;
    return next(err);
  }
  
  // Delete object and redirect to the list of authors.
  User.findByIdAndRemove(req.body.userid, function (err) {
    if (err) { return next(err); }
    // Success - go to list
    res.redirect('/users')
  });
};