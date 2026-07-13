import YahooFinance from 'yahoo-finance2';
import { NQ_HOLDINGS } from './config.js';

const yahooFinance = new YahooFinance();

/**
 * Fetch quote data for a single symbol
 */
export async function fetchQuote(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol);
    return {
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      previousClose: quote.regularMarketPreviousClose,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      marketState: quote.marketState,
      preMarketPrice: quote.preMarketPrice || null,
      preMarketChange: quote.preMarketChangePercent || null,
      postMarketPrice: quote.postMarketPrice || null,
      postMarketChange: quote.postMarketChangePercent || null,
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch quotes for all tracked NQ/QQQ holdings
 */
export async function fetchAllQuotes() {
  const symbols = NQ_HOLDINGS.map(h => h.symbol);
  const results = [];

  for (let i = 0; i < symbols.length; i += 5) {
    const batch = symbols.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(fetchQuote));
    results.push(...batchResults);
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
