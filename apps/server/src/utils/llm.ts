/**
 * LLM 工具模块
 * 封装了基于 Ollama 的大语言模型功能，提供翻译、对话、总结等常用 AI 能力
 */

import { ChatOllama } from '@langchain/ollama';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { splitTextToLines } from './text.js';
import { cotPromptTemplate, outputParser } from './prompt.js';

/**
 * LLM 配置接口
 */
interface LLMConfig {
  /** 模型名称，默认为 'qwen3:0.6b' */
  model?: string;
  /** 温度参数，控制输出的随机性，范围 0-1，默认 0.7 */
  temperature?: number;
  /** Top-p 采样参数，控制多样性，范围 0-1 */
  topP?: number;
  /** 上下文窗口大小，控制模型能处理的最大 token 数 */
  numCtx?: number;
  /** 控制生成的最大 token 数量，影响流式输出的长度 */
  numPredict?: number;
}

/**
 * 翻译选项接口
 */
interface TranslationOptions {
  /** 源语言，默认为 '中文' */
  from?: string;
  /** 目标语言（必填） */
  to: string;
}

/**
 * LLM 类
 * 继承自 ChatOllama，封装了常用的 AI 功能
 */
class LLM extends ChatOllama {
  /**
   * 构造函数
   * @param config LLM 配置选项
   */
  constructor(config: LLMConfig = {}) {
    // 构建 Ollama 配置选项
    const options: Record<string, unknown> = {
      model: config.model || 'qwen3:0.6b', // 默认使用轻量级模型
      temperature: config.temperature ?? 0.7, // 默认温度 0.7，平衡创造性和准确性
    };

    // 只在明确传入参数时才设置，避免覆盖默认值
    if (config.topP !== undefined) {
      options.topP = config.topP;
    }
    if (config.numCtx !== undefined) {
      options.numCtx = config.numCtx;
    }
    if (config.numPredict !== undefined) {
      options.numPredict = config.numPredict;
    }

    super(options);
  }

  /**
   * 对话聊天
   * @param message 用户消息
   * @param systemPrompt 系统提示词（可选）
   * @returns AI 回复文本
   */
  async chat(message: string, systemPrompt?: string): Promise<{ [x: string]: string }> {
    const formatInstructions = outputParser.getFormatInstructions();
    const prompt = await cotPromptTemplate.format({
      question: message,
      format_instructions: formatInstructions,
    });
    const messages: BaseMessage[] = [];

    // 如果提供了系统提示词，添加到消息列表
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    messages.push(new HumanMessage(prompt));

    // 调用模型并返回结果
    const response = await this.invoke(messages);
    // 解析 JSON 格式的响应（自动拆分思考和答案）
    const parsed = await outputParser.parse(response.content.toString());
    return parsed;
  }

  /**
   * 流式对话（返回流）
   * @param message 用户消息
   * @param systemPrompt 系统提示词（可选）
   * @returns 流式响应
   */
  async *chatStream(message: string, systemPrompt?: string) {
    const messages: BaseMessage[] = [];

    // 如果提供了系统提示词，添加到消息列表
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    messages.push(new HumanMessage(message));

    // 创建流式响应
    const stream = await this.stream(messages);
    // 逐块返回内容，用于 SSE 流式传输
    for await (const chunk of stream) {
      yield chunk.content.toString();
    }
  }
}

// 导出单例和类
export const llmInstance = new LLM();
export { LLM };
export default llmInstance;
