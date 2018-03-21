var Group = require('../models/group');
var User = require('../models/user');

var async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');


// Display list of all.
exports.group_list = function(req, res, next) {
  Group.find()
  .sort([['name', 'ascending']])
  .exec(function (err, group_list) {
    if (err) { return next(err); }
    //Successful, so render
    res.render('group_list', { title: 'Group List', group_list});
  });
};

// Display detail page for a specific object.
exports.group_detail = function(req, res, next) {
  async.waterfall([
    function(callback) {
      Group.findOne({ code:req.params.code })
      .populate('parent')
      .populate('incharge')
      .exec(callback);
    },

    function(group, callback) {
      if (group==null) { // No results.
        var err = new Error('Group not found');
        err.status = 404;
        return callback(err);
      } 
      User.find({ 'groups': group._id })
      .exec(function(err, group_users) {
        var results = {group, group_users}
        callback(err, results);
      });
    },
  ], function(err, results) {
    if (err) { return next(err); }
    // Successful, so render
    res.render('group_detail', { title: 'Group Detail', group: results.group, group_users: results.group_users } );
  });
};

// Display create form on GET.
exports.group_create_get = function(req, res, next) {
  async.parallel({
    groups: function(callback){
      Group.find().exec(callback);
    },
    users: function(callback){
      User.find().exec(callback);
    },
  }, function(err, results) {
    if (err) { return next(err); }
    // Successful, so render
    res.render('group_form', { title: 'Create Group', groups: results.groups, users: results.users });
  });
};

// Valid rules
var bodyCode = body('code').isLength({ min: 3 }).trim().withMessage('Code length must be more than 3.')
  .isAlphanumeric().withMessage('Code has non-alphanumeric characters.');
var bodyName = body('name').isLength({ min: 3 }).trim().withMessage('Name length must be more than 3.');
var bodyBrand = body('brand').isLength({ min: 3 }).trim().withMessage('Brand length must be more than 3.')
  .isAlphanumeric().withMessage('Brand has non-alphanumeric characters.');

// Handle create on POST.
exports.group_create_post = [
	// Validate fields.
	bodyCode, bodyName, bodyBrand,
	
	// Sanitize (trim and escape) the name field.
	sanitizeBody('code').trim().escape(),
	sanitizeBody('name').trim().escape(),
	sanitizeBody('brand').trim().escape(),

	// Process request after validation and sanitization.
	(req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);

		// Create a object with escaped and trimmed data.
		var group = new Group({
      code: req.body.code,
      name: req.body.name,
      parent: req.body.parent? req.body.parent: undefined,
      incharge: req.body.incharge? req.body.incharge: undefined,
      brand: req.body.brand,
      type: req.body.type,
		});

		if (!errors.isEmpty()) {
			// There are errors. Render the form again with sanitized values/error messages.
      async.parallel({
        groups: function(callback){
          Group.find().exec(callback);
        },
        users: function(callback){
          User.find().exec(callback);
        },
      }, function(err, results) {
        if (err) { return next(err); }
        // Successful, so render
        res.render('group_form', { title: 'Create Group', group, groups: results.groups, users: results.users, errors: errors.array() });
      });
		}
		else {
			// Data from form is valid.
      group.save(function (err, theGroup) {
        if (err) { return next(err); }
        // Saved. Redirect to its detail page.
        res.redirect(theGroup.url);
      });
		}
	}
];

// Display delete form on GET.
exports.group_delete_get = function(req, res, next) {
  async.waterfall([
    function(callback) {
      Group.findOne({ code:req.params.code })
      .exec(callback);
    },
    function(group, callback) {
      if (group==null) { // No results.
        var err = new Error('Group not found');
        err.status = 404;
        return callback(err);
      } 
      User.find({ 'groups': group._id })
      .exec(function(err, group_users) {
        var results = {group, group_users}
        callback(err, results);
      });
      //TODO: we shall also check devices dependency
      // maybe nest a parallel call inside the waterfall call above
    },
  ], function(err, results) {
    if (err) { return next(err); }
    // Successful, so render
    res.render('group_delete', { title: 'Delete Group', group: results.group, group_users: results.group_users } );
  });
};

// Handle delete on POST.
exports.group_delete_post = function(req, res, next) {
  async.waterfall([
    function(callback) {
      Group.findOne({ code:req.params.code })
      .exec(callback);
    },
    function(group, callback) {
      if (group==null) { // No results.
        var err = new Error('Group not found');
        err.status = 404;
        return callback(err);
      } 
      User.find({ 'groups': group._id })
      .exec(function(err, group_users) {
        var results = {group, group_users}
        callback(err, results);
      });
      //TODO: we shall also check devices dependency
      // maybe nest a parallel call inside the waterfall call above
    },
  ], function(err, results) {
    if (err) { return next(err); }
    // Successful, so render
    res.render('group_delete', { title: 'Delete Group', group: results.group, group_users: results.group_users } );
  });
  
  async.parallel({
		group: function(callback) {
			Group.findById(req.body._id).exec(callback)
		},
		group_users: function(callback) {
			User.find({'group': req.body._id }).exec(callback)
		},
	}, function(err, results) {
		if (err) { return next(err); }
		// Success
		if (results.group_users.length > 0) {
			// Object has dependencies. Render in same way as for GET route.
			res.render('group_delete', { title: 'Delete Group', group: results.group, group_users: results.group_users } );
			return;
		}
		else {
			// Object has no dependencies. Delete object and redirect to the list.
      results.group.remove(function (err, delGroup) {
        if(err) { return next(err); }
        // Success - go to list
        res.redirect('/gp');
      });
		}
	});
};

// Display update form on GET.
exports.group_update_get = function(req, res, next) {
  async.waterfall([
    function(callback) {
      Group.findOne({ code:req.params.code })
      .exec(callback);
    },
    function(group, callback) {
      if (group==null) { // No results.
        var err = new Error('Group not found');
        err.status = 404;
        return callback(err);
      }
      // deep parallel
      async.parallel({
        groups: function(callback){
          Group.find({_id:{$ne:group._id}}).exec(callback); //NOTE: not including current
        },
        users: function(callback){
          User.find().exec(callback); //TODO: only members can be selected as incharge
        },
      }, function(err, results) {
        if (err) { return callback(err); }
        // Successful, so render
        results.group = group;
        callback(err, results);
      });
    }
  ], function(err, results) {
    // Successful, so render
    res.render('group_form', { title: 'Update Group', group: results.group, groups: results.groups, users: results.users });
  });
};

// Handle update on POST.
exports.group_update_post = [
	// Validate fields.
	bodyCode, bodyName, bodyBrand,
	
	// Sanitize (trim and escape) the name field.
	sanitizeBody('code').trim().escape(),
	sanitizeBody('name').trim().escape(),
	sanitizeBody('brand').trim().escape(),

	// Process request after validation and sanitization.
	(req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			// There are errors. Render the form again with sanitized values/error messages.
      async.parallel({
        groups: function(callback) {
          Group.find({_id:{$ne:req.body._id}}).exec(callback); //NOTE: not including current
        },
        users: function(callback){
          User.find().exec(callback); //TODO: only members can be selected as incharge
        },
      }, function(err, results) {
        if (err) { return next(err); }
        res.render('group_form', { title: 'Update Group', group: req.body, groups: results.groups, users: results.users, errors: errors.array() });
      });
		}
		else {
			// Data from form is valid. Update the record.
      Group.findById(req.body._id, function (err, group) {
        if(err) { return next(err); }
        if(group == null) {
          var err = new Error('Err: Group not found!');
          err.status = 404;
          return next(err);
        }
        
        group.code = req.body.code;
        group.name = req.body.name;
        group.parent = req.body.parent? req.body.parent: undefined;
        group.incharge = req.body.incharge? req.body.incharge: undefined;
        group.brand = req.body.brand;
        group.type = req.body.type;
        
        group.save(function (err, updated) {
          if (err) { return next(err); }
          res.redirect(updated.url);
        });
      });
		}
	}
];
