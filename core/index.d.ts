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
       * Sends a standardized HTTP 200 OK success response.
       * @param data Data payload.
       * @param message Success message.
       */
      ok(data?: any, message?: string): Response;

      /**
       * Sends a standardized HTTP 201 Created success response.
       * @param data Data payload.
       * @param message Success message.
       */
      created(data?: any, message?: string): Response;

      /**
       * Sends a standardized HTTP 400 Bad Request error response.
       * @param message Error message.
       * @param errors Detailed errors array or object.
       */
      badRequest(message?: string, errors?: any): Response;

      /**
       * Sends a standardized HTTP 401 Unauthorized error response.
       * @param message Error message.
       */
      unauthorized(message?: string): Response;

      /**
       * Sends a standardized HTTP 403 Forbidden error response.
       * @param message Error message.
       */
      forbidden(message?: string): Response;

      /**
       * Sends a standardized HTTP 404 Not Found error response.
       * @param message Error message.
       */
      notFound(message?: string): Response;

      /**
       * Sends a standardized HTTP 500 Internal Server Error response.
       * @param message Error message.
       * @param errors Error details.
       */
      serverError(message?: string, errors?: any): Response;

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
    swagger?: boolean | any;
    compression?: boolean;
    security?: boolean | any;
  });

  use(record: any): void;
  set(key: string, value: any): void;
  websocket(
    options?:
      | ((ws: any, req: any) => void)
      | { path?: string; auth?: boolean }
  ): WebSocketManager;
  run(): void;

  static helmet(options?: any): Promise<any>;
  static securityHeaders(options?: any): any;
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

export class Hash {
  static make(password: string, options?: { driver?: "scrypt" | "bcrypt"; rounds?: number; N?: number; r?: number; p?: number }): Promise<string>;
  static hash(password: string, options?: { driver?: "scrypt" | "bcrypt"; rounds?: number; N?: number; r?: number; p?: number }): Promise<string>;
  static verify(password: string, hash: string): Promise<boolean>;
  static check(password: string, hash: string): Promise<boolean>;
  static needsRehash(hash: string, options?: { driver?: "scrypt" | "bcrypt"; N?: number; r?: number; p?: number }): boolean;
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
  static middleware(seconds?: number, options?: { driver?: "memory" | "redis" }): (req: Request, res: Response, next: NextFunction) => Promise<any>;
  static get(key: string, options?: { driver?: "memory" | "redis" }): Promise<any | null>;
  static set(key: string, value: any, seconds?: number, options?: { driver?: "memory" | "redis"; fallbackDriver?: "memory" | "redis" }): Promise<boolean>;
  static delete(keys: string | string[]): Promise<boolean>;
  static del(keys: string | string[]): Promise<boolean>;
  static clear(): Promise<boolean>;
  static getMode(): string;
  static size(): number;
}

export function getRedisClient(): any;

export class Render {
  static send(res: Response, viewName: string, data?: Record<string, any>, ttl?: number): Promise<void>;
  static view(viewName: string, staticData?: Record<string, any>): (req: Request, res: Response) => void;
  static cache(seconds?: number): (req: Request, res: Response, next: NextFunction) => Promise<any>;
  static invalidate(keys: string | string[]): Promise<void>;
}

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
  close(): Promise<void>;
}

export class Queue {
  static process(jobName: string, handler: (payload: any) => Promise<any> | any): void;
  static dispatch(jobName: string, payload?: any, options?: { delayMs?: number }): Promise<boolean>;
  static loadJobs(jobsDir?: string): Promise<void>;
}

export default App;


