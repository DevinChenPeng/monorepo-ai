import type { Request, Response, NextFunction } from 'express';

/**
 * 判断请求是否期望使用 SSE（Server-Sent Events）流式响应。
 * 检测条件（任一满足即认为是 SSE 请求）：
 * - 请求头 `Accept` 包含 `text/event-stream`
 * - 请求体中存在 `stream: true`（适用于 JSON body 触发流式行为）
 * - 查询参数 `?stream=1` 或 `?stream=true`
 */
export function isSSERequest(req: Request): boolean {
  const accept = String(req.headers.accept || '');
  const bodyIsStream = typeof req.body === 'object' && req.body !== null && (req.body as Record<string, unknown>)['stream'] === true;
  const query = req.query || {};
  const queryVal = String((query as Record<string, unknown>)['stream'] ?? '').toLowerCase();
  const queryIsStream = queryVal === '1' || queryVal === 'true';

  return accept.includes('text/event-stream') || bodyIsStream || queryIsStream;
}

/**
 * 响应拦截中间件 - 统一处理响应格式和头部
 *
 * 说明：
 * - 对于 SSE 请求（通过 `isSSERequest` 判断），中间件会保留事件流响应，不会重写 `res.json`，
 *   并会设置一些 SSE 友好的缓存头（例如 `Cache-Control: no-cache`）。
 * - 对于普通请求，重写 `res.json`：设置 `Content-Type: application/json;charset=UTF-8`，
 *   并在响应对象中没有 `success` 字段时自动包装为 `{ success: true, data, timestamp }`。
 */
export function responseInterceptor(req: Request, res: Response, next: NextFunction): void {
  // 设置共享头
  res.setHeader('X-Powered-By', 'Express-AI-Server');

  const isSSE = isSSERequest(req);

  if (isSSE) {
    // 对 SSE 请求不要覆盖 Content-Type / res.json，避免破坏事件流
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream;charset=UTF-8');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲
    res.flushHeaders(); // 立即发送头部
    next();
    return;
  }

  // 非 SSE 请求：包装 JSON 响应行为
  const originalJson = res.json.bind(res);

  res.json = function (data: unknown): Response {
    res.setHeader('Content-Type', 'application/json;charset=UTF-8');
    if (data && typeof data === 'object' && !('success' in data)) {
      data = {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } else if (data && typeof data === 'object') {
      (data as Record<string, unknown>).timestamp = new Date().toISOString();
    }

    return originalJson(data);
  };

  next();
}
/**
 * 添加安全响应头
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // 防止 XSS 攻击
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 防止点击劫持
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS 保护
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 严格的传输安全（仅在 HTTPS 环境下启用）
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

/**
 * 响应时间计算中间件
 */
export function responseTime(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // 保存原始的 json 方法
  const originalJson = res.json.bind(res);

  // 重写 json 方法，在发送响应前设置响应时间
  res.json = function (data: unknown): Response {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
    return originalJson(data);
  };

  next();
}

/**
 * 缓存控制中间件
 */
export function cacheControl(maxAge: number = 0) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (maxAge > 0) {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    } else {
      // 禁用缓存
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  };
}

/**
 * 压缩响应（需要配合 compression 中间件使用）
 */
export function compressionHint(req: Request, res: Response, next: NextFunction): void {
  // 添加 Vary 头，告知代理服务器根据 Accept-Encoding 进行缓存
  res.setHeader('Vary', 'Accept-Encoding');
  next();
}

/**
 * API 版本控制
 */
export function apiVersion(version: string = 'v1') {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-API-Version', version);
    next();
  };
}

/**
 * 分页响应包装器
 */
export function paginationWrapper(data: unknown[], page: number, pageSize: number, total: number) {
  return {
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrev: page > 1,
    },
    timestamp: new Date().toISOString(),
  };
}
