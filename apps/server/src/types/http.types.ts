export interface ResponseData {
  code: number | string;
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  message?: string;
  timestamp?: string;
}
