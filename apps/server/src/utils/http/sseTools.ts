import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { CONVERSATION_TYPE_ENUMS, SSE_TYPE_ENUMS, type Conversation } from '../../types/sse.types.js';

export const sendSSEData = (res: Response, data: object, event: string = 'message'): void => {
  const arr = [`id: } \n`, `event: ${event}\n`, `data: ${JSON.stringify(data)}\n`];
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
