export enum SSE_TYPE_ENUMS {
  TEXT = 'text',
  THINK_START = 'think-start',
  THINK_END = 'think-end',
  THINK = 'think',
  CONVERSATION = 'conversation',
  START = 'start',
  END = 'end',
}
export enum CONVERSATION_TYPE_ENUMS {
  ASK = 'ask',
}
/**
 * Conversation
 * @description 会话接口定义了会话对象的结构。
 * @param  conversationId - 会话ID
 * @param  conversationType - 会话类型
 * @param  localMessageId - 会话中消息的唯一标识
 * @param  messageId - 消息的唯一标识
 * @param  type - 消息类型
 */
export interface Conversation {
  conversationId: string;
  conversationType: CONVERSATION_TYPE_ENUMS;
  localMessageId: string;
  messageId: string;
  type: SSE_TYPE_ENUMS;
}
