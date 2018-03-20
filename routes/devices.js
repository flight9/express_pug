var express = require('express');
var router = express.Router();

var groupController = require('../controllers/groupController');
var userController = require('../controllers/userController');
var CPG = userController.check_perm('group');
var GP = groupController.group_prepare;

// GET/POST request to create.
router.get('/:id/create', CPG, groupController.group_create_get);
router.post('/:id/create', CPG, groupController.group_create_post);

// GET/POST request to update.
router.get('/:id/update', CPG, groupController.group_update_get);
router.post('/:id/update', CPG, groupController.group_update_post);

// GET/POST request to delete.
router.get('/:id/delete', CPG, groupController.group_delete_get);
router.post('/:id/delete', CPG, groupController.group_delete_post);

/* GET listing. */
router.get('/:id', CPG, groupController.group_detail);
router.get('/', CPG, groupController.group_list); // NOTE: This must be last

module.exports = router;
