import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import llmInstance from '../utils/langchain/llm.js';
import { createConversation, sendConversation, sendSSEData } from '../utils/http/sseTools.js';
import { badRequestResponse } from '../utils/http/http.js';
import type { AIMessageChunk, MessageStructure } from '@langchain/core/messages';
import { SSE_TYPE_ENUMS } from '../types/sse.types.js';
const llm = llmInstance.getInstance();
const streamHanlder = async (res: Response, stream: AsyncGenerator<AIMessageChunk<MessageStructure>, void, unknown>) => {
  let eventId = 0;
  // 1.让客户端知道这次发送的数据的基本信息ID
  const conversation = createConversation();
  sendConversation(res, conversation);
  sendSSEData(res, { ...conversation, message: { type: SSE_TYPE_ENUMS.START } });
  /**
   * 2.发送开始思考
   * 发送最小数据包为10个字符以减少发送数量
   */
  let isThinking = false;
  let contentText = '',
    reasoningContent = '';
  for await (const chunk of stream) {
    const reasoning_content = chunk.additional_kwargs.reasoning_content;
    const { content, id, response_metadata } = chunk;
    if (reasoning_content && !content) {
      reasoningContent += reasoning_content;
      if (!isThinking) {
        isThinking = true;
        sendSSEData(res, { ...conversation, message: { id, content: '深度思考中', type: SSE_TYPE_ENUMS.THINK_START } });
      }
      if (reasoningContent.length > 10) {
        sendSSEData(res, { ...conversation, message: { id, content: reasoningContent, type: SSE_TYPE_ENUMS.THINK } });
        reasoningContent = '';
      }
    } else {
      if (reasoningContent) {
        sendSSEData(res, { ...conversation, message: { id, content: reasoningContent, type: SSE_TYPE_ENUMS.THINK } });
        reasoningContent = '';
      }
      sendSSEData(res, { ...conversation, message: { id, content: '已完成思考', type: SSE_TYPE_ENUMS.THINK_END } });
      isThinking = false;
    }
    if (content && !isThinking) {
      contentText += content;
      if (contentText.length > 10) {
        sendSSEData(res, { ...conversation, message: { id, content: contentText, type: SSE_TYPE_ENUMS.TEXT } });
        contentText = '';
      }
    }
    if (response_metadata.finish_reason === 'stop' && contentText) {
      sendSSEData(res, { ...conversation, message: { id, content: contentText, type: SSE_TYPE_ENUMS.TEXT } });
      contentText = '';
    }
  }
  sendSSEData(res, { ...conversation, message: { type: SSE_TYPE_ENUMS.END } });
};
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
