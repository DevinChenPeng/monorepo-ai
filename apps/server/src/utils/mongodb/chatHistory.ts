import { MongoDBChatMessageHistory } from '@langchain/mongodb';
import MongoDBUtil from './index.js';
import type { Collection, Document } from 'mongodb';
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

type SortOrder = 'asc' | 'desc';

export interface MongoChatHistoryOptions {
  collectionName?: string;
  sessionTTLSeconds?: number;
}

export interface ListSessionsOptions {
  limit?: number;
  skip?: number;
  order?: SortOrder;
  sessionIds?: string[];
}

export interface MessageQueryOptions {
  limit?: number;
  reverse?: boolean;
}

export interface ChatSessionSummary {
  sessionId: string;
  messageCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const DEFAULT_COLLECTION_NAME = 'chat_message_history';

class MongoChatHistoryTool {
  private readonly options: MongoChatHistoryOptions;
  private readonly mongo: MongoDBUtil;
  private collection: Collection<Document> | null = null;
  private readonly histories = new Map<string, MongoDBChatMessageHistory>();
  private indexesReady = false;

  constructor(options: MongoChatHistoryOptions = {}) {
    this.options = options;
    this.mongo = MongoDBUtil.getInstance();
  }

  private get collectionName(): string {
    return this.options.collectionName ?? process.env.MONGODB_DB_CHAT_COLLECTION_NAME ?? DEFAULT_COLLECTION_NAME;
  }

  private get ttl(): number | undefined {
    return this.options.sessionTTLSeconds;
  }

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

  private async ensureIndexes(): Promise<void> {
    if (!this.collection) {
      return;
    }
    const indexInfos = await this.collection.listIndexes().toArray();
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

  async appendMessage(sessionId: string, message: BaseMessageLike): Promise<void> {
    const history = await this.getHistory(sessionId);
    const normalized = coerceMessageLikeToMessage(message);
    await history.addMessage(normalized);
    await this.touchSession(sessionId);
  }

  async appendHumanMessage(sessionId: string, content: string | MessageContent): Promise<void> {
    await this.appendMessage(sessionId, new HumanMessage(content));
  }

  async appendAIMessage(sessionId: string, content: string | MessageContent): Promise<void> {
    await this.appendMessage(sessionId, new AIMessage(content));
  }

  async appendSystemMessage(sessionId: string, content: string | MessageContent): Promise<void> {
    await this.appendMessage(sessionId, new SystemMessage(content));
  }

  async appendMessages(sessionId: string, messages: BaseMessageLike[]): Promise<void> {
    for (const message of messages) {
      await this.appendMessage(sessionId, message);
    }
  }

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

  async getMessagesAsBuffer(sessionId: string, humanPrefix?: string, aiPrefix?: string): Promise<string> {
    const messages = await this.getMessages(sessionId);
    return getBufferString(messages, humanPrefix, aiPrefix);
  }

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

  async deleteSession(sessionId: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.collection) {
      return;
    }
    await this.collection.deleteOne({ sessionId });
    this.histories.delete(sessionId);
  }

  async clear(sessionId: string): Promise<void> {
    const history = await this.getHistory(sessionId);
    await history.clear();
    this.histories.delete(sessionId);
  }
}

export { MongoChatHistoryTool };
export default MongoChatHistoryTool;
