const express = require('express');
const router = express.Router();
const { list, create, update, remove } = require('../controllers/sourcesController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, list);
router.post('/', authenticate, requireAdmin, create);
router.put('/:id', authenticate, requireAdmin, update);
router.delete('/:id', authenticate, requireAdmin, remove);

module.exports = router;
