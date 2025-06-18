const express = require('express');
const {
  uploadDocument,
  updateDocument,
  getProjectDocuments,
  downloadDocument,
  updatePermissions,
  deleteDocument,
  restoreDocument,
  getDeletedDocuments,
  getDocumentDetails
} = require('../controllers/documentController');
const { authenticateToken, requireVerifiedEmail } = require('../middleware/authMiddleware');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();
router.use(authenticateToken);
router.use(requireVerifiedEmail);

router.post('/upload/:projectId', upload.single('document'), handleUploadError, uploadDocument);
router.get('/project/:projectId', getProjectDocuments);
router.get('/project/:projectId/deleted', getDeletedDocuments);
router.get('/:documentId', getDocumentDetails);
router.get('/:documentId/download', downloadDocument);
router.put('/:documentId', updateDocument);
router.put('/:documentId/permissions', updatePermissions);
router.delete('/:documentId', deleteDocument);
router.patch('/:documentId/restore', restoreDocument);

module.exports = router;