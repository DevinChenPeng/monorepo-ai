/**
 * LLM 工具模块
 * 封装了基于 Ollama 的大语言模型功能，提供翻译、对话、总结等常用 AI 能力
 */

import { ChatOllama } from '@langchain/ollama';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { splitTextToLines } from './text.js';

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
   * 翻译文本
   * @param text 要翻译的文本
   * @param options 翻译选项
   * @returns 翻译后的文本数组（按换行符分割）
   */
  async translation(text: string, options: TranslationOptions): Promise<string> {
    const { from = '中文', to } = options;
    // 构建翻译系统提示词
    const systemPrompt = `你是一个专业的翻译，能将${from}翻译成${to}。请只返回翻译结果，不要添加任何解释。`;

    // 组装消息：系统提示 + 用户输入
    const messages: BaseMessage[] = [new SystemMessage(systemPrompt), new HumanMessage(text)];

    // 调用模型并返回结果
    const response = await this.invoke(messages);
    const content = response.content.toString();
    return content;
  }

  /**
   * 对话聊天
   * @param message 用户消息
   * @param systemPrompt 系统提示词（可选）
   * @returns AI 回复数组（按换行符分割）
   */
  async chat(message: string, systemPrompt?: string): Promise<string> {
    const messages: BaseMessage[] = [];

    // 如果提供了系统提示词，添加到消息列表
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    messages.push(new HumanMessage(message));

    // 调用模型并返回结果
    const response = await this.invoke(messages);
    const content = response.content.toString();
    return content;
  }

  /**
   * 多轮对话
   * @param messages 消息列表
   * @returns AI 回复数组（按换行符分割）
   */
  async chatWithHistory(messages: BaseMessage[]): Promise<string> {
    // 直接使用传入的消息历史进行对话
    const response = await this.invoke(messages);
    const content = response.content.toString();
    return content;
  }

  /**
   * 文本总结
   * @param text 要总结的文本
   * @param maxLength 最大长度（可选）
   * @returns 总结后的文本数组（按换行符分割）
   */
  async summarize(text: string, maxLength?: number): Promise<string> {
    // 根据是否指定长度构建提示词
    const lengthHint = maxLength ? `，总结长度不超过${maxLength}字` : '';
    const systemPrompt = `你是一个专业的文本总结助手。请对以下内容进行总结${lengthHint}，保留关键信息。`;

    const messages: BaseMessage[] = [new SystemMessage(systemPrompt), new HumanMessage(text)];

    // 调用模型并返回总结结果
    const response = await this.invoke(messages);
    const content = response.content.toString();
    return content;
  }

  /**
   * 代码解释
   * @param code 代码片段
   * @param language 编程语言（可选）
   * @returns 代码解释数组（按换行符分割）
   */
  async explainCode(code: string, language?: string): Promise<string> {
    // 如果指定了编程语言，添加语言提示
    const langHint = language ? `这是${language}代码。` : '';
    const systemPrompt = `你是一个代码分析专家。${langHint}请解释以下代码的功能和实现逻辑。`;

    const messages: BaseMessage[] = [new SystemMessage(systemPrompt), new HumanMessage(code)];

    // 调用模型并返回代码解释
    const response = await this.invoke(messages);
    const content = response.content.toString();
    return content;
  }

  /**
   * 文本分类
   * @param text 要分类的文本
   * @param categories 分类选项
   * @returns 分类结果数组（按换行符分割）
   */
  async classify(text: string, categories: string[]): Promise<string> {
    // 将分类选项拼接成中文格式
    const categoriesList = categories.join('、');
    const systemPrompt = `你是一个文本分类专家。请将以下文本分类到这些类别之一：${categoriesList}。只返回类别名称，不要添加解释。`;

    const messages: BaseMessage[] = [new SystemMessage(systemPrompt), new HumanMessage(text)];

    // 调用模型并返回分类结果
    const response = await this.invoke(messages);
    const content = response.content.toString();
    return content;
  }

  /**
   * 情感分析
   * @param text 要分析的文本
   * @returns 情感分析结果数组（按换行符分割）
   */
  async analyzeSentiment(text: string): Promise<string> {
    // 情感分析提示词，限定输出格式
    const systemPrompt = '你是一个情感分析专家。请分析以下文本的情感倾向，只返回：积极、消极或中性。';

    const messages: BaseMessage[] = [new SystemMessage(systemPrompt), new HumanMessage(text)];

    // 调用模型并返回情感分析结果
    const response = await this.invoke(messages);
    const content = response.content.toString();
    return content;
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
