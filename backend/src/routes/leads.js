const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  listLeads, getLead, createLead, updateLead,
  deleteLead, importCSV, addComment,
} = require('../controllers/leadsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers CSV sont acceptés'));
    }
  },
});

router.use(authenticate);

router.get('/', listLeads);
router.post('/', createLead);
router.post('/import', upload.single('file'), importCSV);
router.get('/:id', getLead);
router.put('/:id', updateLead);
router.delete('/:id', requireAdmin, deleteLead);
router.post('/:id/comments', addComment);

module.exports = router;
