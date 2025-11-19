import express from "express";
import type { Application } from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler.js";
import { requestLogger } from "./middlewares/logger.js";
import {
  responseInterceptor,
  responseTime,
  securityHeaders,
} from "./middlewares/contentType.js";
import userRouter from "./routes/user.routes.js";
import healthRouter from "./routes/health.routes.js";
import llmRouter from "./routes/llm.routes.js";

export function createApp(): Application {
  const app = express();

  // 跨域中间件
  app.use(cors());

  // 添加中间件
  app.use(responseTime); // 响应时间计算
  app.use(securityHeaders); // 安全头
  app.use(responseInterceptor); // 响应拦截

  // 中间件
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // 路由
  app.use("/api/health", healthRouter);
  app.use("/api/users", userRouter);
  app.use("/api/llm", llmRouter);

  // 错误处理中间件（必须放在最后）
  app.use(errorHandler);

  return app;
}
