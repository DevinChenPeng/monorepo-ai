import { ChatOllama } from "@langchain/ollama";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { splitTextToLines } from "./text.js";

interface LLMConfig {
  model?: string;
  temperature?: number;
  topP?: number;
  numCtx?: number;
}

interface TranslationOptions {
  from?: string;
  to: string;
}

class LLM extends ChatOllama {
  constructor(config: LLMConfig = {}) {
    const options: Record<string, unknown> = {
      model: config.model || "qwen3:0.6b",
      temperature: config.temperature ?? 0.7,
    };

    if (config.topP !== undefined) {
      options.topP = config.topP;
    }
    if (config.numCtx !== undefined) {
      options.numCtx = config.numCtx;
    }

    super(options);
  }

  /**
   * 翻译文本
   * @param text 要翻译的文本
   * @param options 翻译选项
   * @returns 翻译后的文本数组（按换行符分割）
   */
  async translation(
    text: string,
    options: TranslationOptions
  ): Promise<string[]> {
    const { from = "中文", to } = options;
    const systemPrompt = `你是一个专业的翻译，能将${from}翻译成${to}。请只返回翻译结果，不要添加任何解释。`;

    const messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      new HumanMessage(text),
    ];

    const response = await this.invoke(messages);
    const content = response.content.toString();
    return splitTextToLines(content);
  }

  /**
   * 对话聊天
   * @param message 用户消息
   * @param systemPrompt 系统提示词（可选）
   * @returns AI 回复数组（按换行符分割）
   */
  async chat(message: string, systemPrompt?: string): Promise<string[]> {
    const messages: BaseMessage[] = [];

    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    messages.push(new HumanMessage(message));

    const response = await this.invoke(messages);
    const content = response.content.toString();
    return splitTextToLines(content);
  }

  /**
   * 多轮对话
   * @param messages 消息列表
   * @returns AI 回复数组（按换行符分割）
   */
  async chatWithHistory(messages: BaseMessage[]): Promise<string[]> {
    const response = await this.invoke(messages);
    const content = response.content.toString();
    return splitTextToLines(content);
  }

  /**
   * 文本总结
   * @param text 要总结的文本
   * @param maxLength 最大长度（可选）
   * @returns 总结后的文本数组（按换行符分割）
   */
  async summarize(text: string, maxLength?: number): Promise<string[]> {
    const lengthHint = maxLength ? `，总结长度不超过${maxLength}字` : "";
    const systemPrompt = `你是一个专业的文本总结助手。请对以下内容进行总结${lengthHint}，保留关键信息。`;

    const messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      new HumanMessage(text),
    ];

    const response = await this.invoke(messages);
    const content = response.content.toString();
    return splitTextToLines(content);
  }

  /**
   * 代码解释
   * @param code 代码片段
   * @param language 编程语言（可选）
   * @returns 代码解释数组（按换行符分割）
   */
  async explainCode(code: string, language?: string): Promise<string[]> {
    const langHint = language ? `这是${language}代码。` : "";
    const systemPrompt = `你是一个代码分析专家。${langHint}请解释以下代码的功能和实现逻辑。`;

    const messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      new HumanMessage(code),
    ];

    const response = await this.invoke(messages);
    const content = response.content.toString();
    return splitTextToLines(content);
  }

  /**
   * 文本分类
   * @param text 要分类的文本
   * @param categories 分类选项
   * @returns 分类结果数组（按换行符分割）
   */
  async classify(text: string, categories: string[]): Promise<string[]> {
    const categoriesList = categories.join("、");
    const systemPrompt = `你是一个文本分类专家。请将以下文本分类到这些类别之一：${categoriesList}。只返回类别名称，不要添加解释。`;

    const messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      new HumanMessage(text),
    ];

    const response = await this.invoke(messages);
    const content = response.content.toString();
    return splitTextToLines(content);
  }

  /**
   * 情感分析
   * @param text 要分析的文本
   * @returns 情感分析结果数组（按换行符分割）
   */
  async analyzeSentiment(text: string): Promise<string[]> {
    const systemPrompt =
      "你是一个情感分析专家。请分析以下文本的情感倾向，只返回：积极、消极或中性。";

    const messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      new HumanMessage(text),
    ];

    const response = await this.invoke(messages);
    const content = response.content.toString();
    return splitTextToLines(content);
  }

  /**
   * 流式对话（返回流）
   * @param message 用户消息
   * @param systemPrompt 系统提示词（可选）
   * @returns 流式响应
   */
  async *chatStream(message: string, systemPrompt?: string) {
    const messages: BaseMessage[] = [];

    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    messages.push(new HumanMessage(message));

    const stream = await this.stream(messages);
    for await (const chunk of stream) {
      yield chunk.content.toString();
    }
  }
}

// 导出单例和类
export const llmInstance = new LLM();
export { LLM };
export default llmInstance;
