import { MongoClient, Db, Collection, ObjectId, UUID } from 'mongodb';
import type { DeleteOptions, DeleteResult, Document, Filter, OptionalUnlessRequiredId, WithId } from 'mongodb';
import 'dotenv/config';
import { Document as LangChainDocument } from '@langchain/core/documents';

/**
 * MongoDB 工具类
 * 提供基本的数据库连接和操作功能
 */
class MongoDBUtil {
  private static instance: MongoDBUtil;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  /**
   * 获取单例实例
   * @returns MongoDBUtil 实例
   */
  public static getInstance(): MongoDBUtil {
    if (!MongoDBUtil.instance) {
      MongoDBUtil.instance = new MongoDBUtil();
    }
    return MongoDBUtil.instance;
  }

  /**
   * 连接到 MongoDB 数据库
   * @param uri MongoDB 连接字符串
   * @param dbName 数据库名称
   * @returns Promise<void>
   */
  public async connect(uri: string = process.env.MONGODB_URL || '', dbName: string = process.env.MONGODB_DB_NAME || ''): Promise<void> {
    try {
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db(dbName);
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * 断开数据库连接
   * @returns Promise<void>
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        console.log('Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('Failed to disconnect from MongoDB:', error);
      throw error;
    }
  }

  /**
   * 获取集合引用
   * @param collectionName 集合名称
   * @returns Collection 对象
   */
  public getCollection<T extends Document>(collectionName: string): Collection<T> {
    if (!this.db) {
      throw new Error('Database not connected. Please call connect() first.');
    }
    return this.db.collection<T>(collectionName);
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
        new LangChainDocument({
          pageContent: JSON.stringify(item),
          metadata: metadataSelector?.(item, index) ?? {},
          id: new ObjectId().toString(),
        })
    );
  }

  /**
   * 插入单个文档
   * @param collectionName 集合名称
   * @param document 要插入的文档
   * @returns Promise<any>
   */
  public async insertOne<T extends Document>(collectionName: string, document: OptionalUnlessRequiredId<T>): Promise<any> {
    try {
      const collection = this.getCollection<T>(collectionName);
      const result = await collection.insertOne(document);
      return result;
    } catch (error) {
      console.error(`Failed to insert document into ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * 插入多个文档
   * @param collectionName 集合名称
   * @param documents 要插入的文档数组
   * @returns Promise<any>
   */
  public async insertMany<T extends Document>(collectionName: string, documents: OptionalUnlessRequiredId<T>[]): Promise<any> {
    try {
      const collection = this.getCollection<T>(collectionName);
      const result = await collection.insertMany(documents);
      return result;
    } catch (error) {
      console.error(`Failed to insert documents into ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * 查找单个文档
   * @param collectionName 集合名称
   * @param query 查询条件
   * @returns Promise<T | null>
   */
  public async findOne<T extends Document>(collectionName: string, query: any = {}): Promise<WithId<T> | null> {
    try {
      const collection = this.getCollection<T>(collectionName);
      const result = await collection.findOne(query);
      return result;
    } catch (error) {
      console.error(`Failed to find document in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * 查找多个文档
   * @param collectionName 集合名称
   * @param query 查询条件
   * @param options 查询选项（如限制数量、排序等）
   * @returns Promise<T[]>
   */
  public async findMany<T extends Document>(collectionName: string, query: any = {}, options?: any): Promise<WithId<T>[]> {
    try {
      const collection = this.getCollection<T>(collectionName);
      const cursor = collection.find(query, options);
      const results = await cursor.toArray();
      return results;
    } catch (error) {
      console.error(`Failed to find documents in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * 更新单个文档
   * @param collectionName 集合名称
   * @param query 查询条件
   * @param update 更新内容
   * @returns Promise<any>
   */
  public async updateOne<T extends Document>(collectionName: string, query: any, update: any): Promise<any> {
    try {
      const collection = this.getCollection<T>(collectionName);
      const result = await collection.updateOne(query, update);
      return result;
    } catch (error) {
      console.error(`Failed to update document in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * 更新多个文档
   * @param collectionName 集合名称
   * @param query 查询条件
   * @param update 更新内容
   * @returns Promise<any>
   */
  public async updateMany<T extends Document>(collectionName: string, query: any, update: any): Promise<any> {
    try {
      const collection = this.getCollection<T>(collectionName);
      const result = await collection.updateMany(query, update);
      return result;
    } catch (error) {
      console.error(`Failed to update documents in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * 删除单个文档
   * @param collectionName 集合名称
   * @param query 查询条件
   * @returns Promise<any>
   */
  public async deleteOne<T extends Document>(collectionName: string, query?: Filter<T>): Promise<DeleteResult> {
    try {
      const collection = this.getCollection<T>(collectionName);
      const result = await collection.deleteOne(query);
      return result;
    } catch (error) {
      console.error(`Failed to delete document from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * 删除多个文档
   * @param collectionName 集合名称
   * @param query 查询条件
   * @returns Promise<any>
   */
  public async deleteMany<T extends Document>(collectionName: string, query?: Filter<T>): Promise<DeleteResult> {
    try {
      const collection = this.getCollection<T>(collectionName);
      const result = await collection.deleteMany(query);
      return result;
    } catch (error) {
      console.error(`Failed to delete documents from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * 检查数据库连接状态
   * @returns boolean
   */
  public isConnected(): boolean {
    return !!this.client && !!this.db;
  }
}

export default MongoDBUtil;
export { MongoChatHistoryTool } from './chatHistory.js';
