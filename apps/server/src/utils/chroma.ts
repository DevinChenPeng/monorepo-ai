import { Document } from '@langchain/core/documents';
import { Chroma, type ChromaLibArgs } from '@langchain/community/vectorstores/chroma';
import { OllamaEmbeddings } from '@langchain/ollama';

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
  private vectorStorePromise: Promise<Chroma> | null = null;

  /** 默认检索条数 */
  private readonly defaultK: number;

  constructor(config: ChromaToolboxConfig) {
    this.config = config;
    this.embeddings =
      config.embeddings ??
      new OllamaEmbeddings({
        model: process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text:latest',
        baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      });
    this.defaultK = config.defaultK ?? 4;
  }

  /**
   * 快速使用环境变量创建 Toolbox。
   * 支持通过 overrides 覆盖部分参数，常用于服务启动时统一配置。
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

  private ensureVectorStore() {
    if (!this.vectorStorePromise) {
      this.vectorStorePromise = Chroma.fromTexts([], [], this.embeddings, this.config);
    }
    return this.vectorStorePromise;
  }

  async addDocuments(documents: Document[]) {
    const store = await this.ensureVectorStore();
    await store.addDocuments(documents);
  }

  async addTexts(texts: string[], metadatas?: Record<string, unknown>[]) {
    const documents = texts.map(
      (text, index) =>
        new Document({
          pageContent: text,
          metadata: metadatas?.[index] ?? {},
        })
    );
    await this.addDocuments(documents);
  }

  async similaritySearch(query: string, k = this.defaultK) {
    const store = await this.ensureVectorStore();
    return store.similaritySearch(query, k);
  }

  async similaritySearchWithScore(query: string, k = this.defaultK) {
    const store = await this.ensureVectorStore();
    return store.similaritySearchWithScore(query, k);
  }
}
