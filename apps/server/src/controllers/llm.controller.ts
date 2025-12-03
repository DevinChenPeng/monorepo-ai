import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import llmInstance from '../utils/langchain/llm.js';
import { createConversation, sendConversation, sendSSEData } from '../utils/http/sseTools.js';
import { badRequestResponse } from '../utils/http/http.js';
import type { AIMessageChunk, MessageStructure } from '@langchain/core/messages';
import { SSE_TYPE_ENUMS } from '../types/sse.types.js';
const llm = llmInstance.getInstance();
// SSE 流式处理配置
const SSE_CONFIG = {
  MIN_CHUNK_SIZE: 10, // 最小数据包大小（字符数）
  THINK_START_MSG: '深度思考中',
  THINK_END_MSG: '已完成思考',
} as const;

/**
 * 流式处理状态管理
 */
interface StreamState {
  isThinking: boolean;
  contentBuffer: string;
  reasoningBuffer: string;
}

/**
 * 处理思考内容（reasoning content）
 */
const handleReasoningContent = (
  res: Response,
  conversation: ReturnType<typeof createConversation>,
  state: StreamState,
  chunkId: string | undefined,
  reasoningContent: string
): void => {
  state.reasoningBuffer += reasoningContent;

  // 首次进入思考状态
  if (!state.isThinking) {
    state.isThinking = true;
    sendSSEData(res, {
      ...conversation,
      message: { id: chunkId, content: SSE_CONFIG.THINK_START_MSG, type: SSE_TYPE_ENUMS.THINK_START },
    });
  }

  // 缓冲区达到最小发送阈值
  if (state.reasoningBuffer.length >= SSE_CONFIG.MIN_CHUNK_SIZE) {
    sendSSEData(res, {
      ...conversation,
      message: { id: chunkId, content: state.reasoningBuffer, type: SSE_TYPE_ENUMS.THINK },
    });
    state.reasoningBuffer = '';
  }
};

/**
 * 结束思考状态
 */
const endThinkingState = (
  res: Response,
  conversation: ReturnType<typeof createConversation>,
  state: StreamState,
  chunkId: string | undefined
): void => {
  // 发送剩余的思考内容
  if (state.reasoningBuffer) {
    sendSSEData(res, {
      ...conversation,
      message: { id: chunkId, content: state.reasoningBuffer, type: SSE_TYPE_ENUMS.THINK },
    });
    state.reasoningBuffer = '';
  }

  // 发送思考结束消息
  sendSSEData(res, {
    ...conversation,
    message: { id: chunkId, content: SSE_CONFIG.THINK_END_MSG, type: SSE_TYPE_ENUMS.THINK_END },
  });
  state.isThinking = false;
};

/**
 * 处理文本内容（text content）
 */
const handleTextContent = (
  res: Response,
  conversation: ReturnType<typeof createConversation>,
  state: StreamState,
  chunkId: string | undefined,
  content: string,
  isFinished: boolean = false
): void => {
  if (state.isThinking) return; // 思考状态下不处理文本

  state.contentBuffer += content;

  // 缓冲区达到最小发送阈值或流结束
  if (state.contentBuffer.length >= SSE_CONFIG.MIN_CHUNK_SIZE || isFinished) {
    if (state.contentBuffer) {
      sendSSEData(res, {
        ...conversation,
        message: { id: chunkId, content: state.contentBuffer, type: SSE_TYPE_ENUMS.TEXT },
      });
      state.contentBuffer = '';
    }
  }
};

/**
 * 流式响应处理器
 * @param res - Express Response 对象
 * @param stream - AI 消息流
 */
const streamHanlder = async (res: Response, stream: AsyncGenerator<AIMessageChunk<MessageStructure>, void, unknown>) => {
  // 初始化会话
  const conversation = createConversation();
  sendConversation(res, conversation);
  sendSSEData(res, { ...conversation, message: { type: SSE_TYPE_ENUMS.START } });

  // 初始化状态
  const state: StreamState = {
    isThinking: false,
    contentBuffer: '',
    reasoningBuffer: '',
  };

  // 处理流式数据
  for await (const chunk of stream) {
    const { content, id, response_metadata, additional_kwargs } = chunk;
    const reasoningContent = additional_kwargs?.reasoning_content as string | undefined;

    // 处理思考内容（有推理内容且无正文内容）
    if (reasoningContent && !content) {
      handleReasoningContent(res, conversation, state, id as string | undefined, reasoningContent);
    }
    // 从思考状态切换到正文状态
    else if (state.isThinking) {
      endThinkingState(res, conversation, state, id as string | undefined);
    }

    // 处理正文内容
    if (content) {
      const isFinished = response_metadata?.finish_reason === 'stop';
      handleTextContent(res, conversation, state, id as string | undefined, content.toString(), isFinished);
    }
  }

  // 发送结束消息
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
