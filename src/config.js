/**
 * NQ/QQQ Top Holdings Configuration
 * Approximate weights based on QQQ ETF holdings (updated periodically)
 * These are the major movers that drive NQ futures bias
 */

export const NQ_HOLDINGS = [
  { symbol: 'AAPL',  name: 'Apple',          weight: 8.9 },
  { symbol: 'MSFT',  name: 'Microsoft',      weight: 8.1 },
  { symbol: 'NVDA',  name: 'NVIDIA',         weight: 7.8 },
  { symbol: 'AMZN',  name: 'Amazon',         weight: 5.4 },
  { symbol: 'META',  name: 'Meta Platforms',  weight: 4.9 },
  { symbol: 'GOOGL', name: 'Alphabet (A)',    weight: 2.8 },
  { symbol: 'GOOG',  name: 'Alphabet (C)',    weight: 2.7 },
  { symbol: 'AVGO',  name: 'Broadcom',       weight: 4.5 },
  { symbol: 'TSLA',  name: 'Tesla',          weight: 3.8 },
  { symbol: 'COST',  name: 'Costco',         weight: 2.7 },
  { symbol: 'NFLX',  name: 'Netflix',        weight: 2.5 },
  { symbol: 'AMD',   name: 'AMD',            weight: 2.1 },
  { symbol: 'ADBE',  name: 'Adobe',          weight: 1.8 },
  { symbol: 'QCOM',  name: 'Qualcomm',       weight: 1.6 },
  { symbol: 'TMUS',  name: 'T-Mobile',       weight: 1.5 },
];

// Bias thresholds (weighted % change)
export const BIAS_THRESHOLDS = {
  STRONG_BULLISH: 1.0,
  BULLISH: 0.3,
  NEUTRAL_HIGH: 0.3,
  NEUTRAL_LOW: -0.3,
  BEARISH: -0.3,
  STRONG_BEARISH: -1.0,
};

// Sector groupings for NQ components
export const SECTORS = {
  'Big Tech': ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'META', 'AMZN'],
  'Semiconductors': ['NVDA', 'AVGO', 'AMD', 'QCOM'],
  'Consumer/Growth': ['TSLA', 'NFLX', 'COST', 'TMUS'],
  'Software': ['ADBE'],
};
