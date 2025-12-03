/**
 * LLM 工具模块
 * 封装了基于 ChatDeepSeek 的大语言模型功能，提供流式和非流式输出
 */
import 'dotenv/config';
import type { AIMessageChunk, BaseMessage, MessageStructure } from '@langchain/core/messages';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatDeepSeek, type ChatDeepSeekInput } from '@langchain/deepseek';
import { ragInstance } from './rag.js';
import { wrapSDK } from 'langsmith/wrappers';
/**
 * LLM 配置接口
 */
interface LLMConfig extends Partial<ChatDeepSeekInput> {
  /** 模型名称 */
  model?: string;
  /** 温度参数，控制输出的随机性，范围 0-1，默认 0.7 */
  temperature?: number;
  /** Top-p 采样参数，控制多样性，范围 0-1 */
  topP?: number;
  /** 是否启用 RAG */
  enableRAG?: boolean;
}

/**
 * LLM 类
 * 提供流式和非流式的对话功能
 */
class LLM extends ChatDeepSeek {
  private readonly enableRAG: boolean;
  /**
   * 构造函数
   * @param config LLM 配置选项
   */
  constructor(config: LLMConfig = {}) {
    const options: Record<string, unknown> = {
      model: config.model || process.env.DEEPSEEK_MODEL,
      baseURL: process.env.DEEPSEEK_BASE_URL,
      apiKey: process.env.DEEPSEEK_API_KEY,
      temperature: config.temperature ?? 0.7,
      reasoning: config.reasoning ?? true,
      ...config,
    };
    if (config.topP !== undefined) {
      options.topP = config.topP;
    }
    super(options);
    this.enableRAG = config.enableRAG ?? true;
  }

  /**
   * 非流式对话
   * @param message 用户消息
   * @param systemPrompt 系统提示词（可选）
   * @returns AI 完整回复文本
   */
  async chat(message: string, systemPrompt?: string): Promise<AIMessageChunk<MessageStructure>> {
    const messages: BaseMessage[] = await setMessage(message, this.enableRAG, systemPrompt);
    const response = await this.invoke(messages);
    return response;
  }

  /**
   * 流式对话
   * @param message 用户消息
   * @param systemPrompt 系统提示词（可选）
   * @returns 异步生成器，逐块返回内容
   */
  async *chatStream(message: string, systemPrompt?: string): AsyncGenerator<AIMessageChunk<MessageStructure>, void, unknown> {
    // 将message放入Chroma进行检索
    const messages: BaseMessage[] = await setMessage(message, this.enableRAG, systemPrompt);
    const stream = await this.stream(messages);
    let isThinking = false;
    for await (const chunk of stream) {
      console.log(chunk);
      yield chunk;
    }
  }
}
const setMessage = async (message: string, enableRAG: boolean, systemPrompt?: string): Promise<BaseMessage[]> => {
  const messages: BaseMessage[] = [];
  if (systemPrompt) {
    messages.push(new SystemMessage(systemPrompt));
  }
  // 是否启用RAG检索
  if (enableRAG) {
    const ragMessage = await ragInstance.retrieve(message);
    messages.push(new SystemMessage(ragMessage));
  } else {
    messages.push(new HumanMessage(message));
  }
  return messages;
};
const llmInstance = (function () {
  let instance: LLM;
  return {
    getInstance: function () {
      if (!instance) {
        // 添加监控 通过LangSmith进行监控和可视化
        instance = wrapSDK(new LLM());
      }
      return instance;
    },
  };
})();

// 导出单例和类
export { LLM };
export default llmInstance;
