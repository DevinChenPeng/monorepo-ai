import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import llmInstance from '../utils/llm.js';
import { sendSSEData } from '../utils/sseTools.js';

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
    res.json({
      success: true,
      data: {
        original: text,
        translation,
        from: from || '中文',
        to,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getLLMChart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({
        success: false,
        error: 'text and to are required',
      });
      return;
    }
    console.log('getLLMChart', text);

    // 发送连接成功消息
    sendSSEData(res, { type: 'start' });

    // 使用流式响应
    const stream = llmInstance.chatStream(text);

    for await (const chunk of stream) {
      // 按照 SSE 格式发送数据
      const data = {
        id: randomUUID(),
        type: 'message',
        message: chunk,
        timestamp: new Date().toISOString(),
      };
      sendSSEData(res, data);
    }
    // 发送完成消息
    sendSSEData(res, { type: 'end' });
    res.end();
  } catch (error) {
    // SSE 错误处理
    const errorData = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    res.end();
  }
};
