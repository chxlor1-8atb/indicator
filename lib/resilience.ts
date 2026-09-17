/**
 * Production-Grade Circuit Breaker & Exponential Backoff Resilience Engine.
 * Protects external API dependencies (TradingView, Binance, Bybit, Yahoo Finance, Neon DB).
 */
import { logger } from "./logger";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number; // Failures before opening circuit (default: 3)
  resetTimeoutMs?: number;   // Cooldown period before trying HALF_OPEN (default: 45000ms)
  successThreshold?: number; // Successes in HALF_OPEN to close circuit (default: 2)
  fallback?: <T>() => Promise<T> | T;
}

export class CircuitBreaker {
  public readonly name: string;
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly successThreshold: number;
  private readonly fallback?: <T>() => Promise<T> | T;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = Math.max(1, options.failureThreshold ?? 3);
    this.resetTimeoutMs = Math.max(50, options.resetTimeoutMs ?? 45000);
    this.successThreshold = Math.max(1, options.successThreshold ?? 2);
    this.fallback = options.fallback;
  }

  getState(): CircuitState {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        this.successCount = 0;
        logger.info(`Circuit breaker [${this.name}] transitioned to HALF_OPEN (probing)`, {
          service: "CircuitBreaker",
          circuitState: "HALF_OPEN",
        });
      }
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === "OPEN") {
      const waitRemaining = Math.max(
        0,
        Math.ceil((this.resetTimeoutMs - (Date.now() - this.lastFailureTime)) / 1000)
      );
      const errorMsg = `Circuit breaker [${this.name}] is OPEN (cooldown remaining: ${waitRemaining}s)`;

      if (this.fallback) {
        logger.warn(`${errorMsg} — executing fallback`, {
          service: "CircuitBreaker",
          circuitState: "OPEN",
        });
        return this.fallback<T>() as Promise<T>;
      }

      throw new Error(errorMsg);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err: unknown) {
      this.onFailure(err);
      if (this.fallback) {
        logger.warn(`Execution failed for [${this.name}] — executing fallback`, {
          service: "CircuitBreaker",
          circuitState: this.state,
        }, err);
        return this.fallback<T>() as Promise<T>;
      }
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = "CLOSED";
        this.failureCount = 0;
        this.successCount = 0;
        logger.info(`Circuit breaker [${this.name}] recovered and CLOSED`, {
          service: "CircuitBreaker",
          circuitState: "CLOSED",
        });
      }
    } else if (this.state === "CLOSED") {
      this.failureCount = 0;
    }
  }

  private onFailure(error: unknown): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN" || this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      logger.error(
        `Circuit breaker [${this.name}] TRIPPED to OPEN (failures: ${this.failureCount})`,
        { service: "CircuitBreaker", circuitState: "OPEN" },
        error
      );
    } else {
      logger.warn(
        `Circuit breaker [${this.name}] failure recorded (${this.failureCount}/${this.failureThreshold})`,
        { service: "CircuitBreaker", circuitState: this.state },
        error
      );
    }
  }

  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    logger.info(`Circuit breaker [${this.name}] manually reset to CLOSED`, {
      service: "CircuitBreaker",
      circuitState: "CLOSED",
    });
  }

  getStats() {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

export interface RetryOptions {
  retries?: number;        // Max retry attempts (default: 3)
  baseDelayMs?: number;    // Initial delay (default: 300ms)
  maxDelayMs?: number;     // Maximum delay ceiling (default: 5000ms)
  backoffFactor?: number;  // Multiplier per attempt (default: 2)
  serviceName?: string;    // Service context for logging
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Executes an async operation with exponential backoff and randomized full jitter.
 */
export async function executeWithRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = Math.max(0, options.retries ?? 3);
  const baseDelayMs = Math.max(50, options.baseDelayMs ?? 300);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 5000);
  const backoffFactor = Math.max(1.1, options.backoffFactor ?? 2);
  const service = options.serviceName || "RetryEngine";

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await operation(attempt);
    } catch (err: unknown) {
      lastError = err;

      if (attempt > retries) {
        break;
      }

      // Check if custom filter allows retry
      if (options.shouldRetry && !options.shouldRetry(err, attempt)) {
        throw err;
      }

      // Check for non-retryable 4xx client errors (except 429)
      const errStatus = (err as unknown as { status?: number })?.status;
      if (typeof errStatus === "number" && errStatus >= 400 && errStatus < 500 && errStatus !== 429) {
        throw err;
      }

      // Calculate exponential backoff with full randomized jitter
      const exponentialDelay = Math.min(
        maxDelayMs,
        baseDelayMs * Math.pow(backoffFactor, attempt - 1)
      );
      // Full jitter: uniformly random between 0 and exponentialDelay
      const jitterDelay = Math.floor(Math.random() * exponentialDelay);

      logger.warn(
        `[${service}] Attempt ${attempt}/${retries} failed. Retrying in ${jitterDelay}ms...`,
        { service, attempt, jitterDelay },
        err
      );

      await new Promise((resolve) => setTimeout(resolve, jitterDelay));
    }
  }

  throw lastError;
}

/**
 * Wrapper for fetch requests with automatic retry and rate-limit handling
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return executeWithRetry(async (attempt) => {
    const res = await fetch(url, init);

    if (res.status === 429) {
      // Respect Retry-After header if provided
      const retryAfter = res.headers.get("retry-after");
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000;
      logger.warn(`Rate limit (429) encountered for ${url}. Waiting ${waitMs}ms`, {
        service: retryOptions?.serviceName || "Fetch",
        statusCode: 429,
      });
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 5000)));
      throw Object.assign(new Error(`Rate limit exceeded (429) for ${url}`), {
        status: 429,
      });
    }

    if (!res.ok && res.status >= 500) {
      throw Object.assign(
        new Error(`Server error (${res.status}): ${res.statusText}`),
        { status: res.status }
      );
    }

    return res;
  }, retryOptions);
}
