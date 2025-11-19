import type { Request, Response, NextFunction } from 'express';
import llmInstance from '../utils/llm.js';

export const getLLMTranslation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { text, from, to } = req.body;
    console.log(req.body);
    if (!text || !to) {
      res.status(400).json({
        success: false,
        error: 'text and to are required',
      });
      return;
    }

    const translation = await llmInstance.translation(text, { from, to });
    res.write(translation);
  } catch (error) {
    next(error);
  }
};
