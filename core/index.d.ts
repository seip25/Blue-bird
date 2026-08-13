import { Router as ExpressRouter, Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Response {
      /**
       * Sends a standardized JSON success response.
       * @param data Data payload to return.
       * @param message Success message.
       * @param statusCode HTTP status code (default: 200).
       */
      success(data?: any, message?: string, statusCode?: number): Response;

      /**
       * Sends a standardized JSON error response.
       * @param message Error message.
       * @param statusCode HTTP status code (default: 400).
       * @param errors Array or object of detailed errors.
       */
      error(message?: string, statusCode?: number, errors?: any): Response;

      /**
       * Sends a standardized paginated JSON response.
       * @param data Array of records for current page.
       * @param pagination Object containing page, limit, and total count.
       * @param message Success message.
       */
      paginate(
        data?: any[],
        pagination?: { page?: number; limit?: number; total?: number },
        message?: string
      ): Response;
    }
  }
}

export class AppError extends Error {
  statusCode: number;
  errors: any;
  isOperational: boolean;

  constructor(message: string, statusCode?: number, errors?: any);
}

export class App {
  constructor(options?: {
    routes?: any[];
    cors?: any;
    middlewares?: any[];
    port?: number | string;
    host?: string;
    logger?: boolean;
    notFound?: boolean;
    json?: boolean;
    urlencoded?: boolean;
    static?: { path: string; options?: any };
    cookieParser?: boolean;
    rateLimit?: boolean | any;
    swagger?: boolean | any;
    compression?: boolean;
  });

  use(record: any): void;
  set(key: string, value: any): void;
  websocket(
    options?:
      | ((ws: any, req: any) => void)
      | { path?: string; auth?: boolean }
  ): WebSocketManager;
  run(): void;

  static helmet(options?: any): any;
}

export class WebSocketManager {
  constructor(server: any, options?: { path?: string; auth?: boolean });
  onConnection(handler: (ws: any, req: any) => void): void;
  join(room: string, ws: any): void;
  leave(room: string, ws: any): void;
  broadcast(data: any, room?: string | null): void;
}

export class Router {
  constructor(path?: string, options?: { seo?: boolean; languages?: string[] });

  use(...middleware: any[]): void;
  get(path: string | RegExp, ...callback: any[]): void;
  post(path: string | RegExp, ...callback: any[]): void;
  put(path: string | RegExp, ...callback: any[]): void;
  delete(path: string | RegExp, ...callback: any[]): void;
  patch(path: string | RegExp, ...callback: any[]): void;
  options(path: string | RegExp, ...callback: any[]): void;
  getRouter(): ExpressRouter;
  getPath(): string;
}

export class Validator {
  constructor(schema: Record<string, any>, lang?: string);
  middleware(): (req: Request, res: Response, next: NextFunction) => void;
  validate(data: Record<string, any>): { valid: boolean; errors: any[] };
}

export class Auth {
  static encrypt(payload: any, secret: string): string;
  static decrypt(data: string, secret: string): any;
  static generateToken(payload: any, secret?: string, expiresIn?: string | number): string;
  static verifyToken(token: string, secret?: string): any;
  static protect(options?: { redirect?: string | null; key?: string; cookieKey?: string }): (req: Request, res: Response, next: NextFunction) => Promise<any>;
  static login(res: Response, data: any, key?: string, options?: { expiresIn?: string | number; cookie?: any }): Promise<string>;
  static logout(res: Response, key?: string, options?: any, req?: Request): Promise<boolean>;
}

export class Cache {
  static middleware(seconds?: number): (req: Request, res: Response, next: NextFunction) => Promise<any>;
}

export function getRedisClient(): any;

export class Database {
  constructor(connectionLimit?: number, queueLimit?: number, config?: any);
  init(retries?: number): Promise<boolean>;
  query(sql: string, params?: any[], options?: any): Promise<any>;
  paginate(
    sql: string,
    params?: any[],
    options?: { page?: number; limit?: number; cache?: number }
  ): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>;
  transaction<T = any>(callback: (tx: { query: (sql: string, params?: any[], options?: any) => Promise<any> }) => Promise<T>): Promise<T>;
  executeTransaction<T = any>(callback: (tx: { query: (sql: string, params?: any[], options?: any) => Promise<any> }) => Promise<T>): Promise<T>;
}

export default App;
