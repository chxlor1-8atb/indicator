import { NewsItem } from "./types";

function extractTagValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  let val = match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").trim();
  return val.replace(/<[^>]+>/g, ""); // strip inner html
}

function parseRssItems(xmlText: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches.slice(0, 8)) {
    const title = extractTagValue(itemXml, "title");
    const description = extractTagValue(itemXml, "description");
    const link = extractTagValue(itemXml, "link");
    const pubDate = extractTagValue(itemXml, "pubDate");

    if (title) {
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
        summary: description ? description.substring(0, 180) + "..." : "No additional description available.",
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

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const xml = await res.text();
        const parsed = parseRssItems(xml, feed.source);
        allNews.push(...parsed);
      }
    } catch (err) {
      console.warn(`Feed error for ${feed.source}:`, err);
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
