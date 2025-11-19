import { Router } from 'express';
import type { Request, Response, Router as RouterType } from 'express';

const router: RouterType = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
