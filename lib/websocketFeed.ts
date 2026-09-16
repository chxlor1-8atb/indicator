/**
 * Real-Time WebSocket Market Stream Manager.
 * Establishes low-latency, resilient WebSocket connections for real-time tick streaming,
 * bypassing HTTP polling and eliminating rate-limit bottlenecks.
 */
import { logger } from "./logger";

export interface PriceTick {
  symbol: string;
  price: number;
  quantity?: number;
  timestamp: number;
  source: string;
}

export type PriceTickCallback = (tick: PriceTick) => void;
export type ConnectionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

export class MarketStreamManager {
  private ws: WebSocket | null = null;
  private subscribers = new Map<string, Set<PriceTickCallback>>();
  private status: ConnectionStatus = "DISCONNECTED";
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;
  private readonly maxReconnectDelay = 15000;
  private pingInterval: NodeJS.Timeout | null = null;
  private activeStreams = new Set<string>();

  constructor() {}

  /**
   * Subscribes a listener to live price ticks for a given symbol.
   */
  subscribe(symbol: string, callback: PriceTickCallback): () => void {
    const sym = symbol.toUpperCase();
    if (!this.subscribers.has(sym)) {
      this.subscribers.set(sym, new Set());
    }
    this.subscribers.get(sym)!.add(callback);

    const streamName = this.getStreamName(sym);
    if (streamName && !this.activeStreams.has(streamName)) {
      this.activeStreams.add(streamName);
      this.reconnect();
    }

    // Return unsubscription teardown function
    return () => this.unsubscribe(sym, callback);
  }

  /**
   * Removes a subscription listener.
   */
  unsubscribe(symbol: string, callback: PriceTickCallback): void {
    const sym = symbol.toUpperCase();
    const set = this.subscribers.get(sym);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.subscribers.delete(sym);
        const streamName = this.getStreamName(sym);
        if (streamName) {
          this.activeStreams.delete(streamName);
        }
      }
    }
  }

  private getStreamName(symbol: string): string | null {
    if (symbol === "XAUUSD" || symbol === "GOLD") {
      return "paxgusdt@trade";
    }
    if (symbol.endsWith("USDT")) {
      return `${symbol.toLowerCase()}@trade`;
    }
    return null;
  }

  /**
   * Initiates or refreshes WebSocket connection with active stream list
   */
  connect(): void {
    if (typeof WebSocket === "undefined") {
      logger.warn("WebSocket is not supported in this runtime environment");
      return;
    }

    if (this.activeStreams.size === 0) {
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.status = "CONNECTING";
    const streams = Array.from(this.activeStreams).join("/");
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.status = "CONNECTED";
        this.reconnectDelay = 1000;
        logger.info(`WebSocket connected to ${this.activeStreams.size} stream(s)`, {
          service: "MarketStream",
        });
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (err) => {
        this.status = "ERROR";
        logger.warn("WebSocket stream error", { service: "MarketStream" }, err);
      };

      this.ws.onclose = () => {
        this.status = "DISCONNECTED";
        this.stopHeartbeat();
        this.scheduleReconnect();
      };
    } catch (err) {
      this.status = "ERROR";
      this.scheduleReconnect();
    }
  }

  private handleMessage(raw: string | ArrayBuffer | Blob): void {
    try {
      if (typeof raw !== "string") return;
      const data = JSON.parse(raw);

      // Binance combined stream payload: { stream: "...", data: { s: "BTCUSDT", p: "67000.5", q: "0.1", T: 168... } }
      const tickData = data.data || data;
      const rawSymbol = tickData.s;
      const rawPrice = parseFloat(tickData.p);

      if (!rawSymbol || isNaN(rawPrice)) return;

      let symbol = rawSymbol.toUpperCase();
      if (symbol === "PAXGUSDT") {
        symbol = "XAUUSD"; // Map gold reference
      }

      const tick: PriceTick = {
        symbol,
        price: rawPrice,
        quantity: parseFloat(tickData.q || "0"),
        timestamp: tickData.T || Date.now(),
        source: "BinanceWebSocket",
      };

      // Dispatch to specific symbol subscribers
      const directSubs = this.subscribers.get(symbol);
      if (directSubs) {
        for (const cb of directSubs) {
          try {
            cb(tick);
          } catch (cbErr) {
            logger.error("Error in price tick subscriber callback", { service: "MarketStream", symbol }, cbErr);
          }
        }
      }
    } catch {
      // Ignore unparseable or ping frames
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.activeStreams.size === 0) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  private reconnect(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.connect();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send lightweight ping frame if supported
        try {
          this.ws.send(JSON.stringify({ ping: Date.now() }));
        } catch {}
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.status = "DISCONNECTED";
  }
}

// Global Singleton Stream Manager
export const marketStreamManager = new MarketStreamManager();
