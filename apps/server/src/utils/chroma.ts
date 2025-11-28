import { Document, type DocumentInterface } from '@langchain/core/documents';
import { Chroma, type ChromaLibArgs } from '@langchain/community/vectorstores/chroma';
import { OllamaEmbeddings } from '@langchain/ollama';
import 'dotenv/config';
import { ChromaClient } from 'chromadb';

export interface ChromaToolboxConfig extends Omit<ChromaLibArgs, 'index'> {
  /** 指定集合名称，不同 collection 互相隔离 */
  collectionName: string;
  /** 自定义 Embeddings 实例，默认走 Ollama */
  embeddings?: OllamaEmbeddings;
  /** 默认检索条数 */
  defaultK?: number;
  /** Chroma 服务地址，优先使用 URL */
  url?: string;
  /** 本地持久化目录（与 url 二选一） */
  persistDirectory?: string;
}

/**
 * 小型工具类：负责初始化 Chroma 向量存储，并提供常用的存储 / 检索方法。
 * 默认会复用环境变量中的配置，也支持手动传入覆盖。
 */
export class ChromaToolbox {
  /** 初始化后的配置信息（包含连接参数） */
  private readonly config: ChromaToolboxConfig;

  /** 实际使用的 Embeddings 实例 */
  private readonly embeddings: OllamaEmbeddings;

  /** 延迟初始化的向量存储 */
  private vectorStorePromise: Chroma | null = null;

  /** 默认检索条数 */
  private readonly defaultK: number;

  /** ChromaClient 实例 */
  private readonly chromaClient: ChromaClient;

  constructor(config: ChromaToolboxConfig) {
    this.config = config;
    this.embeddings =
      config.embeddings ??
      new OllamaEmbeddings({
        model: process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text:latest',
        baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      });
    this.defaultK = config.defaultK ?? 4;
    this.chromaClient = new ChromaClient();
  }

  /**
   * @description: 快速使用环境变量创建 Toolbox。
   * @param {Partial<ChromaToolboxConfig>} overrides
   * @return {ChromaToolbox}
   */
  static fromEnv(overrides: Partial<ChromaToolboxConfig> = {}) {
    const baseConfig: ChromaToolboxConfig = {
      collectionName: overrides.collectionName ?? process.env.CHROMA_COLLECTION_NAME ?? 'lc-toolbox',
      defaultK: overrides.defaultK ?? Number(process.env.CHROMA_DEFAULT_K ?? 4),
    };
    const resolvedUrl = overrides.url ?? process.env.CHROMA_URL;
    const resolvedPersistDir = overrides.persistDirectory ?? process.env.CHROMA_PERSIST_DIR;
    const resolvedEmbeddings = overrides.embeddings;
    if (resolvedUrl) baseConfig.url = resolvedUrl;
    if (resolvedPersistDir) baseConfig.persistDirectory = resolvedPersistDir;
    if (resolvedEmbeddings) baseConfig.embeddings = resolvedEmbeddings;

    return new ChromaToolbox(baseConfig);
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
   * @description: 确保向量存储已初始化
   * @return {Chroma}
   */
  private ensureVectorStore(): Chroma {
    if (!this.vectorStorePromise) {
      // // 创建/连接 Chroma 集合，并绑定 Ollama 嵌入函数
      this.vectorStorePromise = new Chroma(
        this.embeddings, // 嵌入模型（自动将示例转为向量）
        this.config // 配置（包含集合名称、URL 等）
      );
    }
    return this.vectorStorePromise;
  }

  /**
   * @description: 添加文档
   * @param {Document[]} documents
   * @return {Promise<void>}
   */
  async addDocuments(documents: Document[]): Promise<void> {
    const store = this.ensureVectorStore();
    console.dir(this);

    await store.addDocuments(documents);
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
    const store = this.ensureVectorStore();
    return store.similaritySearch(query, k);
  }

  /**
   * @description: 相似度检索并返回得分
   * @param {string} query
   * @param {number} k
   * @return {Promise<[DocumentInterface, number][]>}
   */
  async similaritySearchWithScore(query: string, k: number = this.defaultK): Promise<[DocumentInterface, number][]> {
    const store = this.ensureVectorStore();
    return store.similaritySearchWithScore(query, k);
  }
  /**
   * @description: 删除集合
   * @return {Promise<void>}
   */
  async deleteCollection(): Promise<void> {
    if (!this.chromaClient) {
      throw new Error('ChromaClient not initialized');
    }
    try {
      await this.chromaClient.deleteCollection({ name: this.config.collectionName });
    } catch (error) {
      console.error('Error deleting collection:', error);
      throw error;
    }
  }
}
