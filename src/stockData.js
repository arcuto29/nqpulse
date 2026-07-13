import { NQ_HOLDINGS } from './config.js';

/**
 * Stock Data Fetcher - Direct Yahoo Finance Chart API
 * Uses the v8 chart endpoint which is more reliable than the quote endpoint
 * No cookies/crumbs needed
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * Fetch quote data for a single symbol using Yahoo's chart API
 */
export async function fetchQuote(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No data returned');

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const previousClose = meta.previousClose || meta.chartPreviousClose;
    const change = price - previousClose;
    const changePercent = previousClose ? ((change / previousClose) * 100) : 0;

    return {
      symbol: meta.symbol || symbol,
      price,
      change,
      changePercent,
      previousClose,
      dayHigh: meta.regularMarketDayHigh || null,
      dayLow: meta.regularMarketDayLow || null,
      volume: meta.regularMarketVolume || null,
      marketState: meta.marketState || 'UNKNOWN',
      preMarketPrice: meta.preMarketPrice || null,
      preMarketChange: meta.preMarketPrice ? ((meta.preMarketPrice - previousClose) / previousClose * 100) : null,
      postMarketPrice: meta.postMarketPrice || null,
      postMarketChange: meta.postMarketPrice ? ((meta.postMarketPrice - previousClose) / previousClose * 100) : null,
    };
  } catch (error) {
    console.error(`[${symbol}] ${error.message}`);
    return null;
  }
}

/**
 * Fetch quotes for all tracked NQ/QQQ holdings
 */
export async function fetchAllQuotes() {
  const symbols = NQ_HOLDINGS.map(h => h.symbol);
  const results = [];

  // Fetch in batches of 5 with small delays to avoid rate limits
  for (let i = 0; i < symbols.length; i += 5) {
    const batch = symbols.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(fetchQuote));
    results.push(...batchResults);

    // Small delay between batches
    if (i + 5 < symbols.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return results.filter(r => r !== null);
}

/**
 * Fetch QQQ ETF quote
 */
export async function fetchQQQ() {
  return fetchQuote('QQQ');
}

/**
 * Fetch NQ futures quote
 */
export async function fetchNQFutures() {
  return fetchQuote('NQ=F');
}
