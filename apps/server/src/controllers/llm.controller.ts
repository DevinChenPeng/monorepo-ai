import type { Request, Response } from 'express';
import llmInstance from '../utils/langchain/llm.js';
import { streamHanlder } from '../utils/http/sseTools.js';
import { badRequestResponse } from '../utils/http/http.js';
const llm = llmInstance.getInstance();
export const getLLMChart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text) {
      badRequestResponse(res);
      return;
    }
    // 使用流式响应
    const stream = llm.chatStream(text);
    await streamHanlder(res, stream);
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
