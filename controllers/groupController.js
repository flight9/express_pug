var Genre = require('../models/genre');
var Book = require('../models/book');

var async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

exports.group_prepare = function(req, res, next) {
  if(req.params.code) {
    //TODO: get group document to pass to next()
    req.group = {name:'Hello Group'};
    next();
  }
  else {
    next();
  }
}

// Display list of all Genre.
exports.group_list = function(req, res, next) {
  Genre.find()
    .sort([['name', 'ascending']])
    .exec(function (err, list_genres) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('genre_list', { title: 'Genre List', genre_list: list_genres});
    });
};

// Display detail page for a specific Genre.
exports.group_detail = function(req, res, next) {
  async.parallel({
			genre: function(callback) {
					Genre.findById(req.params.id)
						.exec(callback);
			},

			genre_books: function(callback) {
				Book.find({ 'genre': req.params.id })
				.exec(callback);
			},

    }, function(err, results) {
			if (err) { return next(err); }
			if (results.genre==null) { // No results.
					var err = new Error('Genre not found');
					err.status = 404;
					return next(err);
			}
			// Successful, so render
			res.render('genre_detail', { title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books } );
    });
};

// Display Genre create form on GET.
exports.group_create_get = function(req, res, next) {
  res.render('genre_form', { title: 'Create Genre' });
};

// Handle Genre create on POST.
exports.group_create_post = [
   
	// Validate that the name field is not empty.
	body('name', 'Genre name required').isLength({ min: 1 }).trim(),
	
	// Sanitize (trim and escape) the name field.
	sanitizeBody('name').trim().escape(),

	// Process request after validation and sanitization.
	(req, res, next) => {

		// Extract the validation errors from a request.
		const errors = validationResult(req);

		// Create a genre object with escaped and trimmed data.
		var genre = new Genre(
			{ name: req.body.name }
		);

		if (!errors.isEmpty()) {
			// There are errors. Render the form again with sanitized values/error messages.
			res.render('genre_form', { title: 'Create Genre', genre: genre, errors: errors.array()});
			return;
		}
		else {
			// Data from form is valid.
			// Check if Genre with same name already exists.
			Genre.findOne({ 'name': req.body.name })
				.exec( function(err, found_genre) {
					 if (err) { return next(err); }

					 if (found_genre) {
							 // Genre exists, redirect to its detail page.
							 res.redirect(found_genre.url);
					 }
					 else {

						 genre.save(function (err) {
							 if (err) { return next(err); }
							 // Genre saved. Redirect to genre detail page.
							 res.redirect(genre.url);
						 });
					 }
				});
		}
	}
];

// Display Genre delete form on GET.
exports.group_delete_get = function(req, res, next) {
  async.parallel({
    genre: function(callback) {
      Genre.findById(req.params.id).exec(callback);
    },

    genre_books: function(callback) {
      Book.find({'genre': req.params.id }).exec(callback);
    },

  }, function(err, results) {
    if (err) { return next(err); }
    if (results.genre==null) { // No results.
      res.redirect('/catalog/genres');
    }
    // Successful, so render
    res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books } );
  });
};

// Handle Genre delete on POST.
exports.group_delete_post = function(req, res, next) {
  async.parallel({
		genre: function(callback) {
			Genre.findById(req.body.genreid).exec(callback)
		},
		genre_books: function(callback) {
			Book.find({'genre': req.body.genreid }).exec(callback)
		},
	}, function(err, results) {
		if (err) { return next(err); }
		// Success
		if (results.genre_books.length > 0) {
			// Genre has books. Render in same way as for GET route.
			res.render('genre_delete', { title: 'Delete Genre(books not empty)', genre: results.genre, genre_books: results.genre_books } );
			return;
		}
		else {
			// Genre has no books. Delete object and redirect to the list of genres.
			Genre.findByIdAndRemove(req.body.genreid, function(err) {
        if (err) { return next(err); }
        // Success - go to genre list
        res.redirect('/catalog/genres')
			})
		}
	});
};

// Display Genre update form on GET.
exports.group_update_get = function(req, res, next) {
  Genre.findById(req.params.id)
		.exec(function (error, results) {
      if (err) { return next(err); }
      if (results==null) { // No results.
        var err = new Error('Genre not found');
        err.status = 404;
        return next(err);
      }
      res.render('genre_form', { title: 'Update Genre', genre: results });
    });
};

// Handle Genre update on POST.
exports.group_update_post = [
	// Validate that the name field is not empty.
	body('name', 'Genre name required').isLength({ min: 1 }).trim(),
	
	// Sanitize (trim and escape) the name field.
	sanitizeBody('name').trim().escape(),

	// Process request after validation and sanitization.
	(req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);

		// Create a genre object with escaped and trimmed data.
		var genre = new Genre({ 
      name: req.body.name,
      _id: req.params.id
    });

		if (!errors.isEmpty()) {
			// There are errors. Render the form again with sanitized values/error messages.
			res.render('genre_form', { title: 'Update Genre', genre: genre, errors: errors.array()});
			return;
		}
		else {
			// Data from form is valid. Update the record.
      Genre.findByIdAndUpdate(req.params.id, genre, {}, function(err, theGenere){
        if (err) { return next(err); }
        res.redirect(theGenere.url);
      });
		}
	}
];