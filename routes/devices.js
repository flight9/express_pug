var express = require('express');
var router = express.Router({mergeParams: true}); // mergeParams to get nested params

var groupController = require('../controllers/groupController');
var userController = require('../controllers/userController');
var CPD = userController.check_perm('device');

// GET/POST request to create.
router.get('/create', CPD, groupController.group_create_get);
router.post('/create', CPD, groupController.group_create_post);

// GET/POST request to update.
router.get('/:id/update', CPD, groupController.group_update_get);
router.post('/:id/update', CPD, groupController.group_update_post);

// GET/POST request to delete.
router.get('/:id/delete', CPD, groupController.group_delete_get);
router.post('/:id/delete', CPD, groupController.group_delete_post);

/* GET listing. */
router.get('/:id', CPD, groupController.group_detail);
router.get('/', CPD, groupController.group_list); // NOTE: This must be last

module.exports = router;
