// ==================== ROUTES/FORUMROUTES.JS (FIXED) ====================
const express = require('express');
const router = express.Router();
const {
  createForum,
  getProjectForums,
  createDiscussion,
  getForumDiscussions,
  getDiscussion,
  createReply,
  getDiscussionReplies,
  updateReply,
  deleteReply 
} = require('../controllers/forumController');
const { authenticateToken, requireVerifiedEmail } = require('../middleware/authMiddleware');
const { upload, handleUploadError } = require('../middleware/upload');
router.use((req, res, next) => {
  console.log('Forum Route Hit:', req.method, req.url);
  next();
});

router.use(authenticateToken);
router.post('/project/:projectId', createForum);
router.get('/project/:projectId', getProjectForums);
router.post('/:forumId/discussions', upload.array('attachments', 5), handleUploadError, createDiscussion);
router.get('/:forumId/discussions', getForumDiscussions);
router.get('/discussions/:discussionId', getDiscussion);
router.post('/discussions/:discussionId/replies', upload.array('attachments', 3), handleUploadError, createReply);
router.get('/discussions/:discussionId/replies', getDiscussionReplies);
router.put('/replies/:replyId', updateReply);                              
router.delete('/replies/:replyId', deleteReply);

module.exports = router;