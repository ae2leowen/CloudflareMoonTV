/**
 * Structured logger utility.
 * - In production (NODE_ENV=production): only 'warn' and 'error' are output.
 * - In development: all levels are output.
 * - Override with LOG_LEVEL env variable: debug | info | warn | error
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
  if (envLevel && envLevel in LEVEL_RANK) return envLevel;
  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[getMinLevel()];
}

function fmt(level: LogLevel, ctx: string, msg: string): string {
  return `[${new Date().toISOString()}] [${level.toUpperCase().padEnd(5)}] [${ctx}] ${msg}`;
}

export const logger = {
  debug(ctx: string, msg: string, data?: unknown): void {
    if (shouldLog('debug')) console.debug(fmt('debug', ctx, msg), data ?? '');
  },
  info(ctx: string, msg: string, data?: unknown): void {
    if (shouldLog('info')) console.info(fmt('info', ctx, msg), data ?? '');
  },
  warn(ctx: string, msg: string, data?: unknown): void {
    if (shouldLog('warn')) console.warn(fmt('warn', ctx, msg), data ?? '');
  },
  error(ctx: string, msg: string, err?: unknown): void {
    if (shouldLog('error')) console.error(fmt('error', ctx, msg), err ?? '');
  },
};
