var express = require('express');
var router = express.Router();

var userController = require('../controllers/userController');
// var CA = userController.check_auth;
var CPU = userController.check_perm('user');


/* Login & logout & signup */
router.get('/login', userController.user_login_get);
router.post('/login', userController.user_login_post);
router.get('/logout', userController.user_logout);

router.get('/signup', userController.user_create_get);
router.post('/signup', userController.user_create_post);

// GET/POST request to update.
router.get('/:id/update', CPU, userController.user_update_get);
router.post('/:id/update', CPU, userController.user_update_post);

// GET/POST request to delete User.
router.get('/:id/delete', CPU, userController.user_delete_get);
router.post('/:id/delete', CPU, userController.user_delete_post);

/* GET users listing. */
router.get('/:id', CPU, userController.user_detail);
router.get('/', CPU, userController.user_list); // NOTE: This must be last

module.exports = router;
