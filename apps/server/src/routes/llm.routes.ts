import { Router } from 'express';
import type { Router as RouterType } from 'express';
import * as llmController from '../controllers/llm.controller.js';

const router: RouterType = Router();

router.post('/translation', llmController.getLLMTranslation);
router.post('/chart', llmController.getLLMChart);

export default router;
