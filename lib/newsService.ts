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

  for (const itemXml of itemMatches.slice(0, 20)) {
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

      // 1. Precise Word-Boundary Regex Patterns for Bullish Sentiment
      const bullishPatterns = [
        /\b(rise|rises|rising|rose)\b/i,
        /\b(surge|surges|surging|surged)\b/i,
        /\b(jump|jumps|jumped|jumping)\b/i,
        /\b(rally|rallies|rallied|rallying)\b/i,
        /\b(gain|gains|gained|gaining)\b/i,
        /\b(climb|climbs|climbed|climbing)\b/i,
        /\b(soar|soars|soared|soaring)\b/i,
        /\b(advance|advances|advanced|advancing)\b/i,
        /\b(rebound|rebounds|rebounded|rebounding)\b/i,
        /\b(higher|record high|all-time high|ath|breakout)\b/i,
        /\b(bull|bulls|bullish)\b/i,
        /\b(uptrend|recovery|expansion|optimism|outperform)\b/i,
        /\b(rate cut|cut rates|dovish|policy easing|stimulus)\b/i,
        /\b(weaker dollar|weak dollar|dollar weakens|dollar drops|dollar falls|dollar slides)\b/i,
      ];

      // 2. Precise Word-Boundary Regex Patterns for Bearish Sentiment
      // (Uses word boundaries \b to strictly avoid false matches like 'toward' -> 'war', 'software' -> 'war', 'shortfall' -> 'fall')
      const bearishPatterns = [
        /\b(plunge|plunges|plunged|plunging)\b/i,
        /\b(drop|drops|dropped|dropping)\b/i,
        /\b(fall|falls|fell|falling)\b/i,
        /\b(slump|slumps|slumped|slumping)\b/i,
        /\b(tumble|tumbles|tumbled|tumbling)\b/i,
        /\b(sink|sinks|sank|sinking)\b/i,
        /\b(slide|slides|slid|sliding)\b/i,
        /\b(crash|crashes|crashed|crashing)\b/i,
        /\b(selloff|sell-off|dump|dumping)\b/i,
        /\b(lower|record low|breakdown|downtrend)\b/i,
        /\b(bear|bears|bearish)\b/i,
        /\b(rate hike|hike rates|hawkish|tightening)\b/i,
        /\b(war|military conflict|invasion|geopolitical crisis)\b/i,
        /\b(tariff|tariffs|trade conflict)\b/i,
        /\b(stronger dollar|strong dollar|dollar surges|dollar strengthens|dollar rallies)\b/i,
      ];

      const highImpactKeywords = ["fed", "fomc", "powell", "cpi", "nfp", "interest rate", "sec", "central bank", "gdp", "geopolitical", "inflation", "nonfarm"];

      // นับจำนวน pattern ที่ match แต่ละฝั่ง
      const bullMatches = bullishPatterns.filter((p) => p.test(lower));
      const bearMatches = bearishPatterns.filter((p) => p.test(lower));
      const totalMatches = bullMatches.length + bearMatches.length;

      const isBull = bullMatches.length > 0;
      const isBear = bearMatches.length > 0;

      // ถ้าขัดแย้งกัน หรือจำนวนเท่ากัน → NEUTRAL เพื่อป้องกัน bias
      const isContradictory = isBull && isBear;
      if (bullMatches.length > bearMatches.length) sentiment = "BULLISH";
      else if (bearMatches.length > bullMatches.length) sentiment = "BEARISH";
      else sentiment = "NEUTRAL";

      if (highImpactKeywords.some((w) => lower.includes(w))) {
        impact = "HIGH";
      }

      // ─── SENTIMENT CONFIDENCE SCORING ───
      // 0.0 = ไม่รู้เลย, 1.0 = มั่นใจมาก
      let sentimentConfidence: number;
      if (totalMatches === 0) {
        // ไม่มี keyword match → แทบตีความไม่ได้
        sentimentConfidence = 0.10;
      } else if (isContradictory) {
        // ฝั่งที่แพ้ยิ่งมาก → confidence ยิ่งต่ำ
        const minSide = Math.min(bullMatches.length, bearMatches.length);
        const maxSide = Math.max(bullMatches.length, bearMatches.length);
        sentimentConfidence = Math.max(0.15, 0.30 - (minSide / (maxSide + 1)) * 0.15);
      } else {
        // One-sided: ยิ่ง match เยอะ ยิ่ง confident (cap 0.90)
        sentimentConfidence = Math.min(0.90, 0.40 + totalMatches * 0.10);
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
        sentimentConfidence,
        isContradictory,
        isFallback: false,
      });
    }
  }

  return items;
}

function detectRelatedSymbols(text: string): string[] {
  const symbols: string[] = [];
  if (text.includes("gold") || text.includes("xau") || text.includes("bullion") || text.includes("precious metal") || text.includes("silver")) symbols.push("XAUUSD");
  if (text.includes("oil") || text.includes("crude") || text.includes("opec") || text.includes("energy") || text.includes("brent") || text.includes("wti")) symbols.push("USOIL");
  if (text.includes("bitcoin") || text.includes("btc")) symbols.push("BTCUSDT");
  if (text.includes("ethereum") || text.includes("eth")) symbols.push("ETHUSDT");
  if (text.includes("solana") || text.includes("sol")) symbols.push("SOLUSDT");
  if (text.includes("euro") || text.includes("ecb") || text.includes("eur")) symbols.push("EURUSD");
  if (text.includes("yen") || text.includes("boj") || text.includes("jpy") || text.includes("japan")) symbols.push("USDJPY", "GBPJPY", "EURJPY");
  if (text.includes("pound") || text.includes("boe") || text.includes("gbp") || text.includes("uk")) symbols.push("GBPUSD", "GBPJPY");
  if (text.includes("dollar") || text.includes("fed") || text.includes("treasury") || text.includes("fomc") || text.includes("powell") || text.includes("cpi") || text.includes("inflation") || text.includes("rate cut") || text.includes("rate hike")) {
    symbols.push("XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "SPY");
  }
  if (text.includes("s&p") || text.includes("wall street") || text.includes("stocks") || text.includes("nasdaq") || text.includes("dow")) symbols.push("SPY");
  if (text.includes("nvidia") || text.includes("ai chip")) symbols.push("NVDA");
  if (text.includes("tesla") || text.includes("musk") || text.includes("ev")) symbols.push("TSLA");
  return symbols;
}

interface CachedNews {
  data: NewsItem[];
  timestamp: number;
}
let memoryNewsCache: CachedNews | null = null;
const NEWS_CACHE_TTL_MS = 60 * 1000; // 60s memory cache for ultra-fresh news

export async function fetchLiveNews(category = "all"): Promise<NewsItem[]> {
  const now = Date.now();
  if (memoryNewsCache && now - memoryNewsCache.timestamp < NEWS_CACHE_TTL_MS && memoryNewsCache.data.length > 0) {
    return memoryNewsCache.data;
  }

  const allNews: NewsItem[] = [];

  const feeds = [
    {
      url: "https://www.fxstreet.com/rss/news",
      source: "FXStreet News",
    },
    {
      url: "https://www.fxstreet.com/rss/analysis",
      source: "FXStreet Analysis",
    },
    {
      url: "https://finance.yahoo.com/rss/commodities",
      source: "Yahoo Commodities",
    },
    {
      url: "https://finance.yahoo.com/news/rssindex",
      source: "Yahoo Finance",
    },
    {
      url: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
      source: "MarketWatch",
    },
    {
      url: "https://news.google.com/rss/search?q=Gold+price+OR+XAUUSD+when:1d&hl=en-US&gl=US&ceid=US:en",
      source: "Google News (Gold)",
    },
    {
      url: "https://news.google.com/rss/search?q=Forex+trading+OR+EURUSD+when:1d&hl=en-US&gl=US&ceid=US:en",
      source: "Google News (Forex)",
    },
    {
      url: "https://news.google.com/rss/search?q=Federal+Reserve+Inflation+when:1d&hl=en-US&gl=US&ceid=US:en",
      source: "Google News (Macro)",
    },
    {
      url: "https://cointelegraph.com/rss",
      source: "CoinTelegraph",
    },
    {
      url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
      source: "CoinDesk",
    },
  ];

  const feedPromises = feeds.map(async (feed) => {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(3500),
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

  // Deduplicate articles by title similarity
  const seenTitles = new Set<string>();
  const dedupedNews = allNews.filter((n) => {
    const key = n.title.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 35);
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });

  // Sort by published date descending (Latest news first)
  dedupedNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Fallback news if external feeds are blocked
  // ⚠️ sentimentConfidence = 0.0: ห้ามให้ข่าว hardcoded นี้ส่งผลต่อ confluence engine
  if (dedupedNews.length === 0) {
    dedupedNews.push(
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
        sentimentConfidence: 0.0,
        isContradictory: false,
        isFallback: true,
      },
      {
        id: "fallback-2",
        title: "Gold Holds Steady Near Key Resistance as Investors Weigh Geopolitical Tensions and Yields",
        summary: "Bullion prices remain supported by safe-haven demand amid continuous global macroeconomic uncertainty.",
        url: "https://finance.yahoo.com",
        source: "Commodity Insights",
        publishedAt: new Date().toISOString(),
        sentiment: "NEUTRAL",
        impact: "HIGH",
        relatedSymbols: ["XAUUSD"],
        sentimentConfidence: 0.0,
        isContradictory: false,
        isFallback: true,
      },
      {
        id: "fallback-3",
        title: "Tech Sector Outperforms Led by Strong Demand for Semiconductor & AI Infrastructure",
        summary: "Chipmakers and tech giants lead momentum in equity markets as enterprise AI spending accelerates.",
        url: "https://finance.yahoo.com",
        source: "MarketWatch",
        publishedAt: new Date().toISOString(),
        sentiment: "NEUTRAL",
        impact: "MEDIUM",
        relatedSymbols: ["NVDA", "SPY"],
        sentimentConfidence: 0.0,
        isContradictory: false,
        isFallback: true,
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
        sentimentConfidence: 0.0,
        isContradictory: false,
        isFallback: true,
      }
    );
  }

  if (dedupedNews.length > 0) {
    memoryNewsCache = {
      data: dedupedNews,
      timestamp: Date.now(),
    };
  }

  return dedupedNews;
}
