import { MongodbVectorTool } from '../mongodb/vector.js';
import { formatContext, formatRagPrompt } from '../tools/prompt.js';
export interface RAGConfig {
  /** MongoDB 向量工具实例，用于向量检索 */
  mongodbVectorTool?: MongodbVectorTool;
  /** 检索的文档数量 */
  ragK?: number;
  /** 相似度阈值，低于此值的文档将被过滤（范围 0-1，值越大要求越严格） */
  similarityThreshold?: number;
}
export class RAG {
  private readonly mongodbVectorTool: MongodbVectorTool | undefined;
  private readonly ragK: number;
  private readonly similarityThreshold: number;
  constructor(config: RAGConfig) {
    // 1.初始化 MongoDB 向量工具
    if (config.mongodbVectorTool) {
      this.mongodbVectorTool = config.mongodbVectorTool;
    } else {
      this.mongodbVectorTool = new MongodbVectorTool({});
    }
    // 初始化索引
    MongodbVectorTool.initSearchIndex(this.mongodbVectorTool.getCollection());
    // 2.初始化检索的文档数量
    this.ragK = config.ragK ?? 3;
    // 3.初始化相似度阈值（默认 0.3，可根据实际情况调整）
    this.similarityThreshold = config.similarityThreshold ?? 0.3;
  }
  /**
   * @description: 格式化检索到的文档为上下文字符串
   * @param query 查询问题
   * @param k 检索文档数量（可选，默认使用配置的 k）
   * @returns 上下文字符串，如果没有相关文档则返回空字符串
   */
  async retrieve(query: string, k?: number): Promise<string> {
    if (!this.mongodbVectorTool) {
      throw new Error('MongodbVectorTool 实例未初始化');
    }

    // 使用 similaritySearchWithScore 获取文档和相似度分数
    const docsWithScores = await this.mongodbVectorTool.similaritySearchWithScore(query, k || this.ragK);

    // 根据相似度阈值过滤文档
    const relevantDocs = docsWithScores
      .filter(([, score]) => {
        // 注意：Chroma 的相似度分数越小表示越相似（距离度量）
        // 所以这里需要反向比较：分数小于阈值才保留
        console.log(`[RAG] 文档相似度分数: ${score}`);
        return score <= this.similarityThreshold;
      })
      .map(([doc]) => doc);

    if (relevantDocs.length === 0) {
      console.log('[RAG] 未找到相关文档，所有文档相似度都低于阈值');
    }

    console.log(`[RAG] 检索到 ${relevantDocs.length} 个相关文档`);
    console.log(relevantDocs);
    const context = await formatRagPrompt(formatContext(relevantDocs), query);
    return context;
  }
  /**
   * 检查 RAG 是否可用
   * @returns 如果 MongoDB 向量工具已初始化则返回 true
   */
  isAvailable(): boolean {
    return this.mongodbVectorTool !== undefined;
  }
}

export const ragInstance = new RAG({});
export default ragInstance;
