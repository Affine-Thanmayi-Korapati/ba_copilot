import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  generateAnalysis,
  exportMarkdown,
  exportPDF
} from '../controllers/sessions';

const router = Router();

// Apply JWT authentication to all session and analysis endpoints
router.use(authenticateJWT as any);

router.get('/sessions', getSessions);
router.get('/sessions/:id', getSessionById);
router.post('/sessions', createSession);
router.put('/sessions/:id', updateSession);
router.delete('/sessions/:id', deleteSession);

router.post('/analysis/generate', generateAnalysis);

router.post('/export/markdown', exportMarkdown);
router.post('/export/pdf', exportPDF);

export default router;
