import { OllamaEmbeddings } from '@langchain/ollama';
import MongoDBUtil from './index.js';
import 'dotenv/config';
import type { Collection, Filter } from 'mongodb';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { Document, type DocumentInterface } from '@langchain/core/documents';

export interface MongodbToolConfig {
  /** 指定集合名称，不同 collection 互相隔离 */
  collectionName?: string;
  /** 自定义 Embeddings 实例，默认走 Ollama */
  embeddings?: OllamaEmbeddings;
  /** 默认检索条数 */
  defaultK?: number;
  /** Chroma 服务地址，优先使用 URL */
  url?: string;
  /** 本地持久化目录（与 url 二选一） */
  persistDirectory?: string;
}
export class MongodbVectorTool {
  private readonly config: MongodbToolConfig;
  private readonly defaultK: number;
  /** 实际使用的 Embeddings 实例 */
  private readonly embeddings: OllamaEmbeddings;
  /** mongodb 实例 */
  private readonly mongoClient: MongoDBUtil;
  /** 集合 */
  private collection: Collection | null = null;
  /** 向量存储 */
  private vectorStore: MongoDBAtlasVectorSearch | null = null;

  constructor(config: MongodbToolConfig) {
    this.config = config;
    this.defaultK = config.defaultK ?? 4;
    this.embeddings =
      config.embeddings ??
      new OllamaEmbeddings({
        model: process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text:latest',
        baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      });
    this.mongoClient = MongoDBUtil.getInstance();
  }

  /**
   * 初始化向量工具
   * @returns Promise<void>
   */
  async initialize(): Promise<void> {
    // 确保数据库连接
    if (!this.mongoClient.isConnected()) {
      await this.mongoClient.connect();
    }

    // 获取集合引用
    this.collection = this.mongoClient.getCollection(
      this.config.collectionName || process.env.MONGODB_DB_VECTOR_COLLECTION_NAME || 'vector_collection'
    );
    // this.collection.createIndex({ embedding: 'text' });
    // 初始化向量存储
    this.vectorStore = new MongoDBAtlasVectorSearch(this.embeddings, {
      collection: this.collection,
      indexName: 'vector_index',
      textKey: 'content',
      embeddingKey: 'embedding',
    });
  }

  /**
   * 确保向量工具已初始化
   * @returns Promise<void>
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.vectorStore || !this.collection) {
      await this.initialize();
    }
  }

  /**
   * @description: 将任意对象数组转换为 Document 数组
   * @template T
   * @param {T[]} items
   * @param {(item: T, index: number) => Record<string, unknown>} metadataSelector
   * @return {Document[]}
   */
  static toDocuments<T extends Record<string, unknown>>(
    items: T[],
    metadataSelector?: (item: T, index: number) => Record<string, unknown>
  ): Document[] {
    return items.map(
      (item, index) =>
        new Document({
          pageContent: JSON.stringify(item),
          metadata: metadataSelector?.(item, index) ?? {},
        })
    );
  }
  /**
   * @description: 添加文档
   * @param {Document[]} documents
   * @return {Promise<void>}
   */
  async addDocuments(documents: Document[]): Promise<void> {
    if (!documents.length) return;
    await this.ensureInitialized();
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }
    await this.vectorStore.addDocuments(documents);
  }

  /**
   * @description: 添加文本
   * @param {string[]} texts
   * @param {Record<string, unknown>[]} metadatas
   * @return {Promise<void>}
   */
  async addTexts(texts: string[], metadatas?: Record<string, unknown>[]): Promise<void> {
    const documents = texts.map(
      (text, index) =>
        new Document({
          pageContent: text,
          metadata: metadatas?.[index] ?? {},
        })
    );
    await this.addDocuments(documents);
  }

  /**
   * @description: 相似度检索
   * @param {string} query
   * @param {number} k
   * @return {Promise<DocumentInterface[]>}
   */
  async similaritySearch(query: string, k: number = this.defaultK): Promise<DocumentInterface[]> {
    await this.ensureInitialized();
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }
    return this.vectorStore.similaritySearch(query, k);
  }

  async testNativeVectorSearch() {
    if (this.collection) {
      // 取一条已入库文档的向量作为查询向量（模拟用户输入的嵌入向量）
      const sampleDoc = await this.collection.findOne();
      const queryVector = sampleDoc?.embedding; // 用已有向量测试，理论上能匹配到自身
      // 执行原生向量检索（适配 Atlas/$vectorSearch 或本地/$near）
      console.log(queryVector);
      let results;
      results = await this.collection
        .aggregate([
          {
            $vectorSearch: {
              index: 'vector_index',
              path: 'embedding',
              queryVector: queryVector,
              numCandidates: 100,
              limit: 5,
            },
          },
          { $project: { content: 1, score: { $meta: 'vectorSearchScore' } } },
        ])
        .toArray();

      console.log('原生向量检索结果：', results);
    }
  }

  /**
   * @description: 相似度检索并返回得分
   * @param {string} query
   * @param {number} k
   * @return {Promise<[DocumentInterface, number][]>}
   */
  async similaritySearchWithScore(query: string, k: number = this.defaultK): Promise<[DocumentInterface, number][]> {
    await this.ensureInitialized();
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }
    console.log(this.vectorStore);
    return this.vectorStore.similaritySearchWithScore(query, k);
  }

  /**
   * @description: 删除集合
   * @return {Promise<void>}
   */
  async deleteCollection(query: Filter<Document>): Promise<void> {
    await this.ensureInitialized();
    if (!this.mongoClient) {
      throw new Error('MongoDBUtil not initialized');
    }
    try {
      await this.mongoClient.deleteOne(this.config.collectionName || process.env.MONGODB_DB_VECTOR_COLLECTION_NAME || 'vector_collection', query);
    } catch (error) {
      console.error('Error deleting collection:', error);
      throw error;
    }
  }
}

export default MongodbVectorTool;
