var BookInstance = require('../models/bookinstance');
var Book = require('../models/book');

var async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {
  BookInstance.find()
    .populate('book')
    .exec(function (err, list_bookinstances) {
      if (err) { return next(err); }
      // Successful, so render
      res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list: list_bookinstances });
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
      if (err) { return next(err); }
      if (bookinstance==null) { // No results.
        var err = new Error('Book copy not found');
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render('bookinstance_detail', { title: 'Book:', bookinstance:  bookinstance});
    })
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res) {
  Book.find({},'title')
    .exec(function (err, books) {
      if (err) { return next(err); }
      // Successful, so render.
      res.render('bookinstance_form', {title: 'Create BookInstance', book_list:books});
    });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
	// Validate fields.
	body('book', 'Book must be specified').isLength({ min: 1 }).trim(),
	body('imprint', 'Imprint must be specified').isLength({ min: 4 }).trim(),
	body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),
	
	// Sanitize fields.
	sanitizeBody('book').trim().escape(),
	sanitizeBody('imprint').trim().escape(),
	sanitizeBody('status').trim().escape(),
	sanitizeBody('due_back').toDate(),
	
	// Process request after validation and sanitization.
	(req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);

		// Create a BookInstance object with escaped and trimmed data.
		var bookinstance = new BookInstance(
			{ book: req.body.book,
				imprint: req.body.imprint,
				status: req.body.status,
				due_back: req.body.due_back
			 });

		if (!errors.isEmpty()) {
			// There are errors. Render form again with sanitized values and error messages.
			Book.find({},'title')
				.exec(function (err, books) {
					if (err) { return next(err); }
					// Successful, so render.
					res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books, selected_book: bookinstance.book._id , errors: errors.array(), bookinstance:bookinstance });
			});
			return;
		}
		else {
			// Data from form is valid.
			bookinstance.save(function (err) {
				if (err) { return next(err); }
				// Successful - redirect to new record.
				res.redirect(bookinstance.url);
			});
		}
	}
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
	BookInstance.findById(req.params.id)
		.populate('book')
		.exec(function(err, result){
		if (err) { return next(err); }
		if (result==null) { // No results.
			res.redirect('/catalog/bookinstances');
		}
		// Successful, so render.
		res.render('bookinistance_delete', { title: 'Delete Bookinstance', bookinstance: result } );
	});
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res, next) {
	BookInstance.findByIdAndRemove(req.body.bookinstanceid, function(err, result) {
		if (err) { return next(err); }
		// Success - go to bookinstance list
		res.redirect('/catalog/book/'+ result.book)
	})
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res, next) {
  async.parallel({
    bookInstance: function(callback) {
      BookInstance.findById(req.params.id)
      .populate('book')
      .exec(callback);
    },
    books: function(callback) {
      Book.find({},'title').exec(callback);
    }
  }, function(err, results) {
    if (err) { return next(err); }
    if (results.bookInstance==null) { // No results.
      var err = new Error('Book copy not found');
      err.status = 404;
      return next(err);
    }
    // Successful, so render.
    console.log('Bookinstance_update_get', results.bookInstance)
    res.render('bookinstance_form', {title: 'Update BookInstance', bookinstance: results.bookInstance, book_list: results.books});
  });
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
	// Validate fields.
	body('book', 'Book must be specified').isLength({ min: 1 }).trim(),
	body('imprint', 'Imprint must be specified').isLength({ min: 4 }).trim(),
	body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),
	
	// Sanitize fields.
	sanitizeBody('book').trim().escape(),
	sanitizeBody('imprint').trim().escape(),
	sanitizeBody('status').trim().escape(),
	sanitizeBody('due_back').toDate(),
	
	// Process request after validation and sanitization.
	(req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);

		// Create a BookInstance object with escaped and trimmed data.
		var bookinstance = new BookInstance(
			{ book: req.body.book,
				imprint: req.body.imprint,
				status: req.body.status,
				due_back: req.body.due_back,
        _id: req.params.id
			 });

		if (!errors.isEmpty()) {
			// There are errors. Render form again with sanitized values and error messages.
			Book.find({},'title')
			.exec(function (err, books) {
        if (err) { return next(err); }
        // Successful, so render.
        res.render('bookinstance_form', { title: 'Update BookInstance', book_list: books, errors: errors.array(), bookinstance:bookinstance });
			});
			return;
		}
		else {
			// Data from form is valid.
			BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {new:true}, function (err, theBookinstance) {
				if (err) { return next(err); }
				// Successful - redirect to new record.
				res.redirect(theBookinstance.url);
			});
		}
	}
];