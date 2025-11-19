import type { Request, Response, NextFunction } from 'express';

/**
 * 响应拦截中间件 - 统一处理响应格式和头部
 */
export function responseInterceptor(req: Request, res: Response, next: NextFunction): void {
  // 保存原始的 json 方法
  const originalJson = res.json.bind(res);

  // 重写 json 方法
  res.json = function (data: unknown): Response {
    // 设置响应头
    res.setHeader('Content-Type', 'application/json;charset=UTF-8');
    res.setHeader('X-Powered-By', 'Express-AI-Server');
    res.setHeader('X-Response-Time', Date.now().toString());

    // 如果响应数据没有 success 字段，自动包装
    if (data && typeof data === 'object' && !('success' in data)) {
      data = {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    }

    // 调用原始的 json 方法
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

  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
  });

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
