import type { Context, MiddlewareHandler } from 'hono';

export type AppVariables = {
  apiKey: Record<string, unknown>;
  merchant: Record<string, unknown>;
  role: Record<string, unknown>;
  permissions: string[];
};

export type AppContext = Context<{ Variables: AppVariables }>;

export type AppMiddleware = MiddlewareHandler<{ Variables: AppVariables }>;
