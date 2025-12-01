import { ChromaToolbox } from './chroma.js';
import { formatContext, formatRagPrompt } from '../tools/prompt.js';
export interface RAGConfig {
  /** Chroma 工具箱实例，用于向量检索 */
  chromaToolbox?: ChromaToolbox;
  /** 检索的文档数量 */
  ragK?: number;
}
export class RAG {
  private readonly chromaToolbox: ChromaToolbox | undefined;
  private readonly ragK: number;
  constructor(config: RAGConfig) {
    // 1.初始化ChromaToolbox
    if (config.chromaToolbox) {
      this.chromaToolbox = config.chromaToolbox;
    } else {
      this.chromaToolbox = ChromaToolbox.fromEnv();
    }
    // 2.初始化检索的文档数量
    this.ragK = config.ragK ?? 3;
  }
  /**
   * @description: 格式化检索到的文档为上下文字符串
   * @param query 查询问题
   * @param k 检索文档数量（可选，默认使用配置的 k）
   * @returns 上下文字符串
   */
  async retrieve(query: string, k?: number): Promise<string> {
    if (!this.chromaToolbox) {
      throw new Error('ChromaToolbox 实例未初始化');
    }
    const relevantDocs = await this.chromaToolbox.similaritySearch(query, k || this.ragK);
    if (relevantDocs.length === 0) {
      return '';
    }
    const context = await formatRagPrompt(formatContext(relevantDocs), query);
    return context;
  }
  /**
   * 检查 RAG 是否可用
   * @returns 如果 ChromaToolbox 已初始化则返回 true
   */
  isAvailable(): boolean {
    return this.chromaToolbox !== undefined;
  }
}

export const ragInstance = new RAG({});
export default ragInstance;
