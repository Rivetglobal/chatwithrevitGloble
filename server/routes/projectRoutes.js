const express = require('express');
const multer = require('multer');
const router = express.Router();
const auth = require('../middleware/auth');
const projectController = require('../controllers/projectController');

const ALLOWED_EXT_RE = /\.(xlsx|xls|xlsm|xlsb|ods|csv|tsv|pdf|docx|txt|md|markdown|json|log|html|htm|xml|rtf|yaml|yml)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_EXT_RE.test(file.originalname)) cb(null, true);
    else cb(new Error('Unsupported file type. Allowed: PDF, Word (.docx), Excel/CSV, plain text, Markdown, JSON, HTML, XML.'));
  },
});

router.get('/', auth, projectController.listProjects);
router.post('/', auth, projectController.createProject);
router.get('/:id', auth, projectController.getProject);
router.put('/:id', auth, projectController.updateProject);
router.delete('/:id', auth, projectController.deleteProject);

router.post('/:id/sources', auth, upload.single('file'), projectController.uploadSource);
router.post('/:id/sources/link', auth, projectController.addSourceLink);
router.delete('/:id/sources/:sourceId', auth, projectController.deleteSource);

router.get('/:id/booking', auth, projectController.getBookingInfo);
router.get('/:id/booking/rows', auth, projectController.getBookingRows);
router.post('/:id/booking/link', auth, projectController.linkBookingSheet);
router.delete('/:id/booking/link', auth, projectController.unlinkBookingSheet);

router.post('/:id/chat', auth, projectController.chat);

router.get('/:id/conversations', auth, projectController.listConversations);
router.get('/:id/conversations/:convId', auth, projectController.getConversation);
router.put('/:id/conversations/:convId', auth, projectController.renameConversation);
router.delete('/:id/conversations/:convId', auth, projectController.deleteConversation);

router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || 'Upload error' });
  }
  next();
});

module.exports = router;
