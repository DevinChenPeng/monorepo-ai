# MongoDB 工具类使用说明

## 安装依赖

在使用 MongoDB 工具类之前，请确保已安装必要的依赖包：

```bash
# 在项目根目录下执行
pnpm add mongodb
```

注意：对于 TypeScript 项目，mongodb 包已经包含了类型定义，无需额外安装 @types/mongodb。

## 使用方法

### 1. 导入工具类

```typescript
import MongoDBUtil from '../utils/mongodb';
```

### 2. 连接数据库

```typescript
const mongoUtil = MongoDBUtil.getInstance();
await mongoUtil.connect('mongodb://localhost:27017', 'your_database_name');
```

### 3. 基本操作示例

```typescript
// 插入单个文档
const result = await mongoUtil.insertOne('users', {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
});

// 查找单个文档
const user = await mongoUtil.findOne('users', { name: 'John Doe' });

// 查找多个文档
const users = await mongoUtil.findMany('users', { age: { $gte: 18 } });

// 更新文档
const updateResult = await mongoUtil.updateOne('users', { name: 'John Doe' }, { $set: { age: 31 } });

// 删除文档
const deleteResult = await mongoUtil.deleteOne('users', { name: 'John Doe' });
```

### 4. 断开连接

```typescript
await mongoUtil.disconnect();
```

## API 参考

### 静态方法

- `getInstance()`: 获取 MongoDBUtil 单例实例

### 实例方法

- `connect(uri: string, dbName: string)`: 连接到 MongoDB 数据库
- `disconnect()`: 断开数据库连接
- `isConnected()`: 检查数据库连接状态
- `getCollection<T>(collectionName: string)`: 获取集合引用
- `insertOne<T>(collectionName: string, document: T)`: 插入单个文档
- `insertMany<T>(collectionName: string, documents: T[])`: 插入多个文档
- `findOne<T>(collectionName: string, query: any)`: 查找单个文档
- `findMany<T>(collectionName: string, query: any, options?)`: 查找多个文档
- `updateOne<T>(collectionName: string, query: any, update: any)`: 更新单个文档
- `updateMany<T>(collectionName: string, query: any, update: any)`: 更新多个文档
- `deleteOne<T>(collectionName: string, query: any)`: 删除单个文档
- `deleteMany<T>(collectionName: string, query: any)`: 删除多个文档
