/**
 * 定义事件监听器的类型，接收一个载荷参数并执行相应操作
 */
type Listener<Payload> = (payload: Payload) => void;

/**
 * 发布订阅模式的事件管理器
 * 支持类型安全的事件订阅、取消订阅、发布和清除操作
 */
export class PubSub<TEvents extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * 存储事件通道和对应的监听器集合的映射表
   * 键为事件名，值为该事件的所有监听器集合
   */
  private readonly channels = new Map<keyof TEvents, Set<Listener<unknown>>>();

  /**
   * 订阅指定事件
   * @param event 要订阅的事件名称
   * @param listener 事件触发时的回调函数
   * @returns 取消订阅的函数
   */
  subscribe<TKey extends keyof TEvents>(event: TKey, listener: Listener<TEvents[TKey]>): () => void {
    // 获取指定事件的监听器集合，如果不存在则创建一个新的集合
    const listeners = this.channels.get(event) ?? new Set<Listener<unknown>>();
    // 将监听器添加到集合中
    listeners.add(listener as Listener<unknown>);
    // 更新事件通道中的监听器集合
    this.channels.set(event, listeners);
    // 返回一个用于取消订阅的函数
    return () => this.unsubscribe(event, listener);
  }

  /**
   * 取消订阅指定事件
   * @param event 要取消订阅的事件名称
   * @param listener 要移除的监听器函数
   */
  unsubscribe<TKey extends keyof TEvents>(event: TKey, listener: Listener<TEvents[TKey]>): void {
    // 获取指定事件的监听器集合
    const listeners = this.channels.get(event);
    // 如果没有找到监听器集合，则直接返回
    if (!listeners) return;
    // 从集合中删除指定的监听器
    listeners.delete(listener as Listener<unknown>);
    // 如果监听器集合为空，则删除该事件通道
    if (listeners.size === 0) {
      this.channels.delete(event);
    }
  }

  /**
   * 发布指定事件
   * @param event 要发布的事件名称
   * @param payload 传递给监听器的数据载荷
   */
  publish<TKey extends keyof TEvents>(event: TKey, payload: TEvents[TKey]): void {
    // 获取指定事件的监听器集合
    const listeners = this.channels.get(event);
    // 如果没有找到监听器集合，则直接返回
    if (!listeners) return;
    // 遍历所有监听器并执行，传递载荷数据
    for (const listener of listeners) {
      (listener as Listener<TEvents[TKey]>)(payload);
    }
  }

  /**
   * 清除指定事件的所有监听器，如果不传入事件名则清除所有事件
   * @param event 要清除的事件名称，可选参数
   */
  clear(event?: keyof TEvents): void {
    // 如果未指定事件名，则清除所有事件通道
    if (typeof event === 'undefined') {
      this.channels.clear();
      return;
    }
    // 删除指定事件通道
    this.channels.delete(event);
  }
}
