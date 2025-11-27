import type { ResponseData } from '../types/http.types.js';
import { HTTP_ERROR_MESSAGE, HTTP_STATUS } from '../constants/http.js';
import type { Response } from 'express';

export const successResponse = (data: unknown): ResponseData => {
  return {
    code: HTTP_STATUS.OK,
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
};

export const errorResponse = (code: number | string, message: string): ResponseData => {
  return {
    code,
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
};

export const badRequestResponse = (res: Response, message: string = HTTP_ERROR_MESSAGE.BAD_REQUEST): void => {
  res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse(HTTP_STATUS.BAD_REQUEST, message));
};
