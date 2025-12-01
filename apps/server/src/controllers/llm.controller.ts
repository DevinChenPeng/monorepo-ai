import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import llmInstance from '../utils/langchain/llm.js';
import { sendSSEData } from '../utils/http/sseTools.js';
import { badRequestResponse } from '../utils/http/http.js';
const llm = llmInstance.getInstance();
export const getLLMChart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text) {
      badRequestResponse(res);
      return;
    }
    // 发送连接成功消息
    sendSSEData(res, { type: 'start' });

    // 使用流式响应
    const stream = llm.chatStream(text);

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
