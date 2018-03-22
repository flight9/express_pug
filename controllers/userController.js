var bcrypt  = require('bcrypt');
var mongoose = require('mongoose');
var User = require('../models/user');
var Group = require('../models/group');

var async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Set up multer
var fs = require('fs');
var path = require('path');
var multer = require('multer');
var referPath = '/uploads/avatar/';
var localBase = path.join(__basedir, 'public');
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(localBase, referPath));
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-'+ Date.now()+ path.extname(file.originalname).toLowerCase())
  }
})
var fileFilter = function (req, file, cb) {
  var filetypes = /jpeg|jpg|png/;
  var mimetype = filetypes.test(file.mimetype);
  var extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  if (!mimetype || !extname) {
    return cb(new Error('Error: File upload only supports the following filetypes - ' + filetypes));
  }
  return cb(null, true);
};
var limits = {
  fileSize: 1*1000*1000
};
var upload = multer({ storage, fileFilter, limits}); // dest 可以相对于根目录(也可以绝对路径)

// ZM: Middleware to check authorized permissions (including check_auth)
function check_perm(resource) {
  return [ check_auth, 
    function (req, res, next) {
      // Guess operate
      var parts = req.path.split('/');
      var lastSegment = parts.pop() || parts.pop();  // handle potential trailing slash
      var allOperates = User.allOperates();
      var operate = allOperates.indexOf(lastSegment)>-1? lastSegment: 'read';
      
      // Try to get parameters 
      var id = req.params.id;
      var user = new User(req.session.user);
      var err401 = new Error('Access Denied!');
      err401.status = 401;
      console.log('Res id:', id);
      console.log('Operate:', operate);
      
      // Prepare info and invoke can()
      var what = User.whatInfoToCan(resource, operate, id);
      var info = {req, id};
      console.log('whatInfoToCan what:', what, resource);
      if( what.group || what.target) {
        // async queries to get group and target info
        var calls = {};
        if( what.group) {
          var code = req.params.code;
          if(!code) { return next(err401); }
          calls.group = function(callback) {
            Group.findOne({code}).exec(callback);
          }
        }
        if( what.target) {
          var ModelName = resource.capitalize();
          var Target = mongoose.model(ModelName);
          calls.target = function(callback) {
            Target.findById(id).exec(callback);
          }
        }
        async.parallel(calls, function(err, results) {
          if (err) { return next(err); }
          if (results.group) {
            // not attach to info but req (for later used by controller)
            req.group = results.group;
          }
          if (results.target) {
            info.target = results.target;
          }
          console.log('whatInfoToCan group&target:', req.group, info.target);
          user.can(operate, resource, info)? next(): next(err401);
        });
      }
      else {
        // sync pass info for other operates
        user.can(operate, resource, info)? next(): next(err401);
      }
    }
  ];
}
exports.check_perm = check_perm;

// ZM: Middleware to check authenticated status
function check_auth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    req.session.last_url = req.originalUrl;
    res.redirect('/users/login');
  }
};
// exports.check_auth = check_auth;

// ZM: Display User login form on GET.
exports.user_login_get = function(req, res, next) {
  res.render('user_login', { title: 'Login'});
};

// ZM: help function to auth user
function authenticate(name, pass, callback) {
  User.findOne({ username: name })
    .populate('groups', 'code name') // 'url' will not be populated
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
  // Upload(NOTE: must before validators)
  upload.single('avatar'),
  
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
      if( req.file) {
        user.avatar = referPath+ req.file.filename;
      }
      console.log('Avator file:', req.file);
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
  .populate('groups','name')
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

// Help function
var bodyPasswordExist = body('password0').isLength({ min: 4 }).trim().withMessage('Existing Password length must be more than 4.');

// Help function to delete file
function deleteFile(avatar_path) {
  if (avatar_path) {
    let del = path.join(localBase, avatar_path);
    if (fs.existsSync(del)) {
      fs.unlinkSync(del);
    }
  }
}

// Handle User update on POST.
exports.user_update_post = [
// Upload(NOTE: must before validators)
  upload.single('avatar'),

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
      // Check password again
      authenticate(req.body.username, req.body.password0, function(err, user){
        if (err) { return next(err); }
        
        // Update after check password
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
          if( req.file) {
            // If new avatar then update and delete
            deleteFile(user.avatar);
            user.avatar = referPath+ req.file.filename;
          }
          
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

// Handle User delete on POST.
exports.user_delete_post = function(req, res, next) {
  // ZM: Check if it is myself
  if(req.session.user && req.session.user._id.toString() == req.body.userid) {
    var err = new Error('Err: You cant delete the account of yourself!');
    err.status = 403;
    return next(err);
  }
  
  // Delete object and redirect to the list of users.
  User.findById(req.body.userid, function (err, user) {
    if(err) { return next(err); }
    if(user == null) {
      var err = new Error('Err: User not found!');
      err.status = 404;
      return next(err);
    }
    
    // Remember to delete avatar file first.
    deleteFile(user.avatar);
    user.remove(function (err, delUser) {
      if(err) { return next(err); }
      // Success - go to list
      res.redirect('/users');
    });
  });
};

// Display User updateRole form on GET.
exports.user_updaterole_get = function(req, res, next) {
  async.parallel({
    user: function(callback) {
      User.findById(req.params.id).exec(callback);
    },
    groups: function(callback) {
      Group.find().exec(callback);
    }
  }, function(err, results) {
    if (err) { return next(err); } 
		if (results.user==null) { // No results.
      var err = new Error('User not found');
      err.status = 404;
      return next(err);
		}
		// Successful, so render.
    allRoles = User.allRoles();
		res.render('user_role', { title: 'Update Roles & Groups', user: results.user, allRoles, allGroups: results.groups });
  });
};

// Handle User updaterole on POST.
exports.user_updaterole_post = function (req, res, next) {
    // Update without check password
    User.findById(req.body._id, function (err, user) {
      if(err) { return next(err); }
      if(user == null) {
        var err = new Error('Err: User not found!');
        err.status = 404;
        return next(err);
      }
      user.roles = (typeof req.body.roles==='undefined') ? [] : req.body.roles;
      //TODO: if removed from a group, a user can't still be its incharge, how to clean thats?
      user.groups = (typeof req.body.groups==='undefined') ? [] : req.body.groups;
      
      user.save(function (err, updatedUser) {
        if (err) { return next(err); }
        res.redirect(updatedUser.url);
      });
    });
  };