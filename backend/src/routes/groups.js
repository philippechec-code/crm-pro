const express = require('express');
const router = express.Router();
const { listGroups, getGroup, createGroup, updateGroup, deleteGroup } = require('../controllers/groupsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/', listGroups);
router.get('/:id', getGroup);
router.post('/', createGroup);
router.put('/:id', updateGroup);
router.delete('/:id', requireAdmin, deleteGroup);

module.exports = router;
