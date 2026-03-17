const express = require('express');
const router = express.Router();
const {
  listReminders, createReminder, updateReminder, deleteReminder
} = require('../controllers/remindersController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', listReminders);
router.post('/', createReminder);
router.put('/:id', updateReminder);
router.delete('/:id', deleteReminder);

module.exports = router;
