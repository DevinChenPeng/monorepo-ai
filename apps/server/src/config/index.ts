export const config = {
  port: process.env.PORT || 1234,
  env: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
};

// SSE 流式处理配置
export const SSE_CONFIG = {
  MIN_CHUNK_SIZE: 10, // 最小数据包大小（字符数）
  THINK_START_MSG: '深度思考中',
  THINK_END_MSG: '已完成思考',
} as const;
