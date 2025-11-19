# Express Web 应用示例

## 项目结构

```
src/
├── app.ts                    # Express 应用主配置
├── index.ts                  # 应用入口
├── config/
│   └── index.ts             # 应用配置
├── middlewares/
│   ├── errorHandler.ts      # 错误处理中间件
│   └── logger.ts            # 日志中间件
├── routes/
│   ├── health.routes.ts     # 健康检查路由
│   └── user.routes.ts       # 用户路由
├── controllers/
│   └── user.controller.ts   # 用户控制器
├── services/
│   └── user.service.ts      # 用户服务层
└── types/
    └── user.types.ts        # 用户类型定义
```

## 运行项目

```bash
# 编译
pnpm run compile

# 运行
pnpm run dev
```

## API 接口示例

### 1. 健康检查

```bash
curl http://localhost:3000/api/health
```

### 2. 获取所有用户

```bash
curl http://localhost:3000/api/users
```

### 3. 获取单个用户

```bash
curl http://localhost:3000/api/users/1
```

### 4. 创建用户

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Charlie\",\"email\":\"charlie@example.com\"}"
```

### 5. 更新用户

```bash
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Alice Updated\"}"
```

### 6. 删除用户

```bash
curl -X DELETE http://localhost:3000/api/users/1
```

## 功能特性

- ✅ Express 框架
- ✅ TypeScript 支持
- ✅ 分层架构（Controller -> Service）
- ✅ 错误处理中间件
- ✅ 请求日志中间件
- ✅ RESTful API 设计
- ✅ 类型安全
- ✅ 模块化路由
- ✅ 环境配置
