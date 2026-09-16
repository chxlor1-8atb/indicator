/**
 * Structured Logger with automatic sensitive data redaction.
 * Sanitizes Telegram Bot Tokens, Database Connection Strings, and Private API Keys.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogContext {
  service?: string;
  symbol?: string;
  endpoint?: string;
  latencyMs?: number;
  circuitState?: string;
  statusCode?: number;
  [key: string]: unknown;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

const CURRENT_LOG_LEVEL: LogLevel =
  (process.env.LOG_LEVEL?.toUpperCase() as LogLevel) || "INFO";

/**
 * Redacts sensitive credentials (tokens, passwords) from strings and objects
 */
export function sanitizeLogData(input: unknown): unknown {
  if (typeof input === "string") {
    return input
      // Redact Telegram bot token pattern: 123456789:ABCdefGhI...
      .replace(/\b\d{8,10}:[A-Za-z0-9_-]{35}\b/g, "[REDACTED_TELEGRAM_TOKEN]")
      // Redact Postgres connection string passwords: postgres://user:password@host/db
      .replace(
        /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi,
        "$1***REDACTED***$3"
      )
      // Redact common API keys
      .replace(/(key|token|secret|password)=([^&\s]+)/gi, "$1=[REDACTED]");
  }

  if (input !== null && typeof input === "object") {
    if (Array.isArray(input)) {
      return input.map(sanitizeLogData);
    }

    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("token") ||
        lowerKey.includes("password") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("apikey")
      ) {
        sanitizedObj[key] = "[REDACTED]";
      } else {
        sanitizedObj[key] = sanitizeLogData(value);
      }
    }
    return sanitizedObj;
  }

  return input;
}

class StructuredLogger {
  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: unknown
  ): string {
    const timestamp = new Date().toISOString();
    const serviceTag = context?.service ? `[${context.service}]` : "";
    const symbolTag = context?.symbol ? `[${context.symbol}]` : "";
    const latencyTag =
      context?.latencyMs !== undefined ? ` (${context.latencyMs}ms)` : "";

    const cleanMsg = sanitizeLogData(message);
    let output = `${timestamp} [${level}] ${serviceTag}${symbolTag} ${cleanMsg}${latencyTag}`;

    if (context && Object.keys(context).length > 0) {
      const filteredContext = { ...context };
      delete filteredContext.service;
      delete filteredContext.symbol;
      delete filteredContext.latencyMs;

      if (Object.keys(filteredContext).length > 0) {
        output += ` | Meta: ${JSON.stringify(sanitizeLogData(filteredContext))}`;
      }
    }

    if (error) {
      const errMsg =
        error instanceof Error
          ? error.stack || error.message
          : String(error);
      output += ` | Error: ${sanitizeLogData(errMsg)}`;
    }

    return output;
  }

  private shouldLog(level: LogLevel): boolean {
    return (
      LOG_LEVEL_PRIORITY[level] >= (LOG_LEVEL_PRIORITY[CURRENT_LOG_LEVEL] || 20)
    );
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog("DEBUG")) {
      console.debug(this.formatMessage("DEBUG", message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog("INFO")) {
      console.info(this.formatMessage("INFO", message, context));
    }
  }

  warn(message: string, context?: LogContext, error?: unknown): void {
    if (this.shouldLog("WARN")) {
      console.warn(this.formatMessage("WARN", message, context, error));
    }
  }

  error(message: string, context?: LogContext, error?: unknown): void {
    if (this.shouldLog("ERROR")) {
      console.error(this.formatMessage("ERROR", message, context, error));
    }
  }
}

export const logger = new StructuredLogger();
