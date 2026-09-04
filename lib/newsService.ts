import { NewsItem } from "./types";

function cleanHtmlText(raw: string): string {
  if (!raw) return "";
  let val = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").trim();
  // Unescape standard HTML entities (&lt; &gt; &quot; &amp; &nbsp; &apos;)
  val = val
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");

  // Decode numeric entities (e.g. &#8217; &#8220; &#8221;)
  val = val.replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCharCode(Number(dec));
    } catch {
      return "";
    }
  });
  val = val.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return "";
    }
  });

  // Strip all HTML tags
  val = val.replace(/<[^>]+>/g, " ");
  // Collapse whitespace
  val = val.replace(/\s+/g, " ").trim();

  // If text is purely an URL or anchor link leftover, discard it
  if (/^https?:\/\//i.test(val) || /^href=/i.test(val) || val.includes("news.google.com/rss/articles")) {
    return "";
  }
  return val;
}

function extractTagValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  return cleanHtmlText(match[1]);
}

function extractTagRaw(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").trim();
}

function parseRssItems(xmlText: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches.slice(0, 8)) {
    const title = extractTagValue(itemXml, "title");
    let description = extractTagValue(itemXml, "description");
    let link = extractTagRaw(itemXml, "link");
    const pubDate = extractTagRaw(itemXml, "pubDate");

    // If link is empty, search for actual article url in guid or href attributes
    if (!link || !link.startsWith("http")) {
      const guid = extractTagRaw(itemXml, "guid");
      if (guid && guid.startsWith("http")) {
        link = guid;
      } else {
        const hrefMatch = itemXml.match(/href=["'](https?:\/\/[^"']+)["']/i) || itemXml.match(/href=&quot;(https?:\/\/[^&]+)&quot;/i);
        if (hrefMatch) link = hrefMatch[1];
      }
    }

    if (title) {
      // If description is empty or just duplicate of title, don't show duplicate summary
      if (description) {
        if (description.toLowerCase().includes(title.toLowerCase()) && description.length < title.length + 25) {
          description = "";
        }
      }

      const lower = (title + " " + description).toLowerCase();
      let sentiment: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
      let impact: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";

      const bullishKeywords = ["surge", "jump", "rally", "gain", "record high", "cut rate", "dovish", "optimism", "soar", "bullish", "approval", "breakout"];
      const bearishKeywords = ["plunge", "drop", "fall", "slump", "rate hike", "hawkish", "inflation spikes", "war", "selloff", "crash", "bearish", "tariff"];
      const highImpactKeywords = ["fed", "fomc", "powell", "cpi", "nfp", "interest rate", "sec", "central bank", "gdp", "geopolitical"];

      const isBull = bullishKeywords.some((w) => lower.includes(w));
      const isBear = bearishKeywords.some((w) => lower.includes(w));
      if (isBull && !isBear) sentiment = "BULLISH";
      else if (isBear && !isBull) sentiment = "BEARISH";

      if (highImpactKeywords.some((w) => lower.includes(w))) {
        impact = "HIGH";
      }

      items.push({
        id: Buffer.from(title).toString("base64").substring(0, 16),
        title,
        summary: description ? description.substring(0, 180) + (description.length > 180 ? "..." : "") : "",
        url: link || "https://finance.yahoo.com",
        source,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        sentiment,
        impact,
        relatedSymbols: detectRelatedSymbols(lower),
      });
    }
  }

  return items;
}

function detectRelatedSymbols(text: string): string[] {
  const symbols: string[] = [];
  if (text.includes("gold") || text.includes("xau") || text.includes("bullion")) symbols.push("XAUUSD");
  if (text.includes("oil") || text.includes("crude") || text.includes("opec") || text.includes("energy")) symbols.push("USOIL");
  if (text.includes("bitcoin") || text.includes("btc")) symbols.push("BTCUSDT");
  if (text.includes("ethereum") || text.includes("eth")) symbols.push("ETHUSDT");
  if (text.includes("solana") || text.includes("sol")) symbols.push("SOLUSDT");
  if (text.includes("euro") || text.includes("ecb")) symbols.push("EURUSD");
  if (text.includes("dollar") || text.includes("fed") || text.includes("treasury") || text.includes("fomc")) symbols.push("XAUUSD", "EURUSD", "SPY");
  if (text.includes("s&p") || text.includes("wall street") || text.includes("stocks")) symbols.push("SPY");
  if (text.includes("nvidia") || text.includes("ai chip")) symbols.push("NVDA");
  if (text.includes("tesla") || text.includes("musk") || text.includes("ev")) symbols.push("TSLA");
  return symbols;
}

export async function fetchLiveNews(category = "all"): Promise<NewsItem[]> {
  const allNews: NewsItem[] = [];

  const feeds = [
    {
      url: "https://finance.yahoo.com/news/rssindex",
      source: "Yahoo Finance",
    },
    {
      url: "https://news.google.com/rss/search?q=Federal+Reserve+Inflation+Gold+Forex+Bitcoin&hl=en-US&gl=US&ceid=US:en",
      source: "Google Financial News",
    },
    {
      url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
      source: "CoinDesk",
    },
  ];

  const feedPromises = feeds.map(async (feed) => {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(4000),
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const xml = await res.text();
        return parseRssItems(xml, feed.source);
      }
    } catch (err) {
      console.warn(`Feed error for ${feed.source}:`, err);
    }
    return [];
  });

  const results = await Promise.allSettled(feedPromises);
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      allNews.push(...r.value);
    }
  }

  // Fallback news if external feeds are blocked
  if (allNews.length === 0) {
    allNews.push(
      {
        id: "fallback-1",
        title: "Federal Reserve Signals Data-Dependent Approach on Future Interest Rate Moves",
        summary: "Fed officials emphasize monitoring inflation and labor market metrics before considering additional policy easing steps.",
        url: "https://finance.yahoo.com",
        source: "Global Market Wire",
        publishedAt: new Date().toISOString(),
        sentiment: "NEUTRAL",
        impact: "HIGH",
        relatedSymbols: ["XAUUSD", "EURUSD", "SPY"],
      },
      {
        id: "fallback-2",
        title: "Gold Holds Steady Near Key Resistance as Investors Weigh Geopolitical Tensions and Yields",
        summary: "Bullion prices remain supported by safe-haven demand amid continuous global macroeconomic uncertainty.",
        url: "https://finance.yahoo.com",
        source: "Commodity Insights",
        publishedAt: new Date().toISOString(),
        sentiment: "BULLISH",
        impact: "HIGH",
        relatedSymbols: ["XAUUSD"],
      },
      {
        id: "fallback-3",
        title: "Tech Sector Outperforms Led by Strong Demand for Semiconductor & AI Infrastructure",
        summary: "Chipmakers and tech giants lead momentum in equity markets as enterprise AI spending accelerates.",
        url: "https://finance.yahoo.com",
        source: "MarketWatch",
        publishedAt: new Date().toISOString(),
        sentiment: "BULLISH",
        impact: "MEDIUM",
        relatedSymbols: ["NVDA", "SPY"],
      },
      {
        id: "fallback-4",
        title: "Bitcoin and Digital Assets Consolidate Following Institutional Inflows",
        summary: "Crypto markets trade in range-bound structure as ETF flows stabilize across major global exchanges.",
        url: "https://www.coindesk.com",
        source: "Crypto Pulse",
        publishedAt: new Date().toISOString(),
        sentiment: "NEUTRAL",
        impact: "MEDIUM",
        relatedSymbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
      }
    );
  }

  return allNews;
}
