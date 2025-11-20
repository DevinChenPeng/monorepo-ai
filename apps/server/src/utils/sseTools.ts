import { randomUUID } from 'node:crypto';
import type { Response } from 'express';

export const sendSSEData = (res: Response, data: object, event: string = 'message'): void => {
  const arr = [`id: ${randomUUID()} \n`, `event: ${event}\n`, `data: ${JSON.stringify(data)}\n`];
  res.write(arr.join('') + '\n');
};
