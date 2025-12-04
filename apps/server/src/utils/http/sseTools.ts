import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { CONVERSATION_TYPE_ENUMS, SSE_TYPE_ENUMS, type Conversation, type StreamState } from '../../types/sse.types.js';
import type { AIMessageChunk, MessageStructure } from '@langchain/core/messages';
import { SSE_CONFIG } from '../../config/index.js';

export const sendSSEData = (res: Response, data: object, event: string = 'message'): void => {
  const arr = [`id: ${randomUUID()} \n`, `event: ${event}\n`, `data: ${JSON.stringify(data)}\n`];
  res.write(arr.join('') + '\n');
};

export const sendConversation = (res: Response, conversation: Conversation): void => {
  sendSSEData(res, conversation);
};

export const createConversation = (): Conversation => ({
  conversationId: randomUUID(),
  conversationType: CONVERSATION_TYPE_ENUMS.ASK,
  localMessageId: randomUUID(),
  messageId: randomUUID(),
  type: SSE_TYPE_ENUMS.CONVERSATION,
});

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
export const streamHanlder = async (res: Response, stream: AsyncGenerator<AIMessageChunk<MessageStructure>, void, unknown>) => {
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
    if (content || response_metadata?.finish_reason) {
      const isFinished = response_metadata?.finish_reason === 'stop';
      handleTextContent(res, conversation, state, id as string | undefined, content.toString(), isFinished);
    }
  }

  // 发送结束消息
  sendSSEData(res, { ...conversation, message: { type: SSE_TYPE_ENUMS.END } });
};
