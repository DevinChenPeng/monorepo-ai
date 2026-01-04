import { MongoDBChatMessageHistory } from '@langchain/mongodb';
import MongoDBUtil from './index.js';
import { MongoServerError, type Collection, type Document } from 'mongodb';
import {
  AIMessage,
  BaseMessage,
  type BaseMessageLike,
  HumanMessage,
  type MessageContent,
  SystemMessage,
  coerceMessageLikeToMessage,
  getBufferString,
} from '@langchain/core/messages';

// 定义排序顺序类型，用于指定升序或降序
type SortOrder = 'asc' | 'desc';

// MongoDB聊天历史选项接口
export interface MongoChatHistoryOptions {
  // 可选的集合名称，默认为'chat_message_history'
  collectionName?: string;
  // 会话TTL（生存时间）秒数，用于设置会话过期时间
  sessionTTLSeconds?: number;
}

// 列出会话的选项接口
export interface ListSessionsOptions {
  // 限制返回的会话数量
  limit?: number;
  // 跳过的会话数量（用于分页）
  skip?: number;
  // 排序顺序（升序或降序）
  order?: SortOrder;
  // 特定会话ID列表，如果指定则只返回这些会话
  sessionIds?: string[];
}

// 消息查询选项接口
export interface MessageQueryOptions {
  // 限制返回的消息数量
  limit?: number;
  // 是否反转消息顺序
  reverse?: boolean;
}

// 聊天会话摘要接口
export interface ChatSessionSummary {
  // 会话ID
  sessionId: string;
  // 消息数量
  messageCount: number;
  // 会话创建时间
  createdAt?: Date;
  // 会话更新时间
  updatedAt?: Date;
}

// 默认集合名称常量
const DEFAULT_COLLECTION_NAME = 'chat_message_history';

/**
 * MongoDB聊天历史工具类
 * 提供了对聊天历史的增删查改功能，支持会话管理和消息操作
 */
class MongoChatHistoryTool {
  // 工具配置选项
  private readonly options: MongoChatHistoryOptions;
  // MongoDB工具实例
  private readonly mongo: MongoDBUtil;
  // MongoDB集合实例
  private collection: Collection<Document> | null = null;
  // 缓存的历史记录实例映射，用于提高性能
  private readonly histories = new Map<string, MongoDBChatMessageHistory>();
  // 索引是否已准备好的标志
  private indexesReady = false;

  /**
   * 构造函数
   * @param options 配置选项
   */
  constructor(options: MongoChatHistoryOptions = {}) {
    this.options = options;
    this.mongo = MongoDBUtil.getInstance();
  }

  /**
   * 获取集合名称
   * 优先级：选项中指定 > 环境变量 > 默认值
   */
  private get collectionName(): string {
    return this.options.collectionName ?? process.env.MONGODB_DB_CHAT_COLLECTION_NAME ?? DEFAULT_COLLECTION_NAME;
  }

  /**
   * 获取TTL（生存时间）设置
   */
  private get ttl(): number | undefined {
    return this.options.sessionTTLSeconds;
  }

  /**
   * 确保初始化完成
   * 连接数据库并设置集合和索引
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.mongo.isConnected()) {
      await this.mongo.connect();
    }
    if (!this.collection) {
      this.collection = this.mongo.getCollection<Document>(this.collectionName);
    }
    if (!this.indexesReady && this.collection) {
      await this.ensureIndexes();
      this.indexesReady = true;
    }
  }

  /**
   * 确保必要的索引已创建
   * 创建sessionId索引和TTL索引（如果设置了TTL）
   */
  private async ensureIndexes(): Promise<void> {
    if (!this.collection) {
      return;
    }
    let indexInfos: Document[] = [];
    try {
      indexInfos = await this.collection.listIndexes().toArray();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 26) {
        // NamespaceNotFound表示集合尚不存在，继续创建索引
        indexInfos = [];
      } else {
        throw error;
      }
    }
    const hasSessionIndex = indexInfos.some((idx) => idx.name === 'sessionId_1');
    if (!hasSessionIndex) {
      await this.collection.createIndex({ sessionId: 1 }, { unique: true });
    }
    if (this.ttl != null) {
      const ttlIndexName = 'updatedAt_ttl';
      const hasTTL = indexInfos.some((idx) => idx.name === ttlIndexName);
      if (!hasTTL) {
        await this.collection.createIndex({ updatedAt: 1 }, { name: ttlIndexName, expireAfterSeconds: this.ttl });
      }
    }
  }

  /**
   * 获取指定会话的历史记录实例
   * 如果不存在则创建新的实例并缓存
   * @param sessionId 会话ID
   */
  private async getHistory(sessionId: string): Promise<MongoDBChatMessageHistory> {
    if (!sessionId) {
      throw new Error('Session id required');
    }
    await this.ensureInitialized();
    if (!this.collection) {
      throw new Error('MongoDB collection unavailable');
    }
    let history = this.histories.get(sessionId);
    if (!history) {
      history = new MongoDBChatMessageHistory({ collection: this.collection as any, sessionId });
      this.histories.set(sessionId, history);
    }
    return history;
  }

  /**
   * 更新会话的时间戳和消息计数
   * @param sessionId 会话ID
   */
  private async touchSession(sessionId: string): Promise<void> {
    if (!this.collection) {
      return;
    }
    const now = new Date();
    await this.collection.updateOne({ sessionId }, [
      {
        $set: {
          updatedAt: now,
          createdAt: { $ifNull: ['$createdAt', now] },
          messageCount: { $size: '$messages' },
        },
      },
    ]);
  }

  /**
   * 向指定会话追加消息
   * @param sessionId 会话ID
   * @param message 要添加的消息
   */
  async appendMessage(sessionId: string, message: BaseMessageLike): Promise<void> {
    const history = await this.getHistory(sessionId);
    const normalized = coerceMessageLikeToMessage(message);
    await history.addMessage(normalized);
    await this.touchSession(sessionId);
  }

  /**
   * 向指定会话追加人类消息
   * @param sessionId 会话ID
   * @param content 消息内容
   */
  async appendHumanMessage(sessionId: string, content: string | MessageContent): Promise<void> {
    await this.appendMessage(sessionId, new HumanMessage(content));
  }

  /**
   * 向指定会话追加AI消息
   * @param sessionId 会话ID
   * @param content 消息内容
   */
  async appendAIMessage(sessionId: string, content: string | MessageContent): Promise<void> {
    await this.appendMessage(sessionId, new AIMessage(content));
  }

  /**
   * 向指定会话追加系统消息
   * @param sessionId 会话ID
   * @param content 消息内容
   */
  async appendSystemMessage(sessionId: string, content: string | MessageContent): Promise<void> {
    await this.appendMessage(sessionId, new SystemMessage(content));
  }

  /**
   * 向指定会话批量追加消息
   * @param sessionId 会话ID
   * @param messages 消息数组
   */
  async appendMessages(sessionId: string, messages: BaseMessageLike[]): Promise<void> {
    for (const message of messages) {
      await this.appendMessage(sessionId, message);
    }
  }

  /**
   * 获取指定会话的消息
   * @param sessionId 会话ID
   * @param options 查询选项
   */
  async getMessages(sessionId: string, options: MessageQueryOptions = {}): Promise<BaseMessage[]> {
    const history = await this.getHistory(sessionId);
    const messages = await history.getMessages();
    const ordered = options.reverse ? [...messages].reverse() : messages;
    if (options.limit == null || options.limit < 0) {
      return ordered;
    }
    if (options.reverse) {
      return ordered.slice(0, options.limit);
    }
    return ordered.slice(Math.max(0, ordered.length - options.limit));
  }

  /**
   * 将指定会话的消息转换为缓冲字符串
   * @param sessionId 会话ID
   * @param humanPrefix 人类消息前缀
   * @param aiPrefix AI消息前缀
   */
  async getMessagesAsBuffer(sessionId: string, humanPrefix?: string, aiPrefix?: string): Promise<string> {
    const messages = await this.getMessages(sessionId);
    return getBufferString(messages, humanPrefix, aiPrefix);
  }

  /**
   * 列出聊天会话
   * @param options 列表选项
   */
  async listSessions(options: ListSessionsOptions = {}): Promise<ChatSessionSummary[]> {
    await this.ensureInitialized();
    if (!this.collection) {
      return [];
    }
    const { limit = 20, skip = 0, order = 'desc', sessionIds } = options;
    const pipeline: Document[] = [];
    if (sessionIds?.length) {
      pipeline.push({ $match: { sessionId: { $in: sessionIds } } });
    }
    pipeline.push({
      $addFields: {
        messageCount: { $ifNull: ['$messageCount', { $size: '$messages' }] },
      },
    });
    pipeline.push({ $sort: { updatedAt: order === 'asc' ? 1 : -1, sessionId: 1 } });
    if (skip > 0) {
      pipeline.push({ $skip: skip });
    }
    if (limit > 0) {
      pipeline.push({ $limit: limit });
    }
    pipeline.push({
      $project: {
        _id: 0,
        sessionId: 1,
        messageCount: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    });
    const summaries = await this.collection.aggregate(pipeline).toArray();
    return summaries.map((summary) => ({
      sessionId: summary.sessionId as string,
      messageCount: (summary.messageCount as number) ?? 0,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
    }));
  }

  /**
   * 删除指定会话
   * @param sessionId 会话ID
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.collection) {
      return;
    }
    await this.collection.deleteOne({ sessionId });
    this.histories.delete(sessionId);
  }

  /**
   * 清空指定会话的消息
   * @param sessionId 会话ID
   */
  async clear(sessionId: string): Promise<void> {
    const history = await this.getHistory(sessionId);
    await history.clear();
    this.histories.delete(sessionId);
  }
}

export { MongoChatHistoryTool };
export default MongoChatHistoryTool;
