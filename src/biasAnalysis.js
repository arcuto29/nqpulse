import { NQ_HOLDINGS, BIAS_THRESHOLDS, SECTORS } from './config.js';

/**
 * Calculate overall market bias based on weighted stock movements
 */
export function calculateBias(quotes) {
  if (!quotes || quotes.length === 0) {
    return { bias: 'UNKNOWN', score: 0, details: 'No data available' };
  }

  let weightedSum = 0;
  let totalWeight = 0;
  let bullCount = 0;
  let bearCount = 0;

  const stockDetails = [];

  for (const quote of quotes) {
    const holding = NQ_HOLDINGS.find(h => h.symbol === quote.symbol);
    if (!holding) continue;

    const weight = holding.weight;
    const pctChange = quote.changePercent || 0;

    weightedSum += pctChange * (weight / 100);
    totalWeight += weight;

    if (pctChange > 0) bullCount++;
    else if (pctChange < 0) bearCount++;

    stockDetails.push({
      symbol: quote.symbol,
      name: holding.name,
      weight,
      changePercent: pctChange,
      contribution: pctChange * (weight / 100),
      price: quote.price,
    });
  }

  const normalizedScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

  let bias;
  if (normalizedScore >= BIAS_THRESHOLDS.STRONG_BULLISH) bias = 'STRONG BULLISH';
  else if (normalizedScore >= BIAS_THRESHOLDS.BULLISH) bias = 'BULLISH';
  else if (normalizedScore <= BIAS_THRESHOLDS.STRONG_BEARISH) bias = 'STRONG BEARISH';
  else if (normalizedScore <= BIAS_THRESHOLDS.BEARISH) bias = 'BEARISH';
  else bias = 'NEUTRAL';

  const breadth = {
    bullish: bullCount,
    bearish: bearCount,
    neutral: quotes.length - bullCount - bearCount,
    total: quotes.length,
    ratio: bullCount / (bullCount + bearCount || 1),
  };

  stockDetails.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    bias,
    score: normalizedScore,
    breadth,
    topMovers: stockDetails.slice(0, 5),
    allStocks: stockDetails,
  };
}

/**
 * Analyze bias by sector
 */
export function calculateSectorBias(quotes) {
  const sectorResults = {};

  for (const [sector, symbols] of Object.entries(SECTORS)) {
    const sectorQuotes = quotes.filter(q => symbols.includes(q.symbol));
    if (sectorQuotes.length === 0) continue;

    const avgChange = sectorQuotes.reduce((sum, q) => sum + (q.changePercent || 0), 0) / sectorQuotes.length;
    const bullCount = sectorQuotes.filter(q => (q.changePercent || 0) > 0).length;

    let sectorBias;
    if (avgChange >= 1.0) sectorBias = 'STRONG BULLISH';
    else if (avgChange >= 0.3) sectorBias = 'BULLISH';
    else if (avgChange <= -1.0) sectorBias = 'STRONG BEARISH';
    else if (avgChange <= -0.3) sectorBias = 'BEARISH';
    else sectorBias = 'NEUTRAL';

    sectorResults[sector] = {
      bias: sectorBias,
      avgChange,
      stocks: sectorQuotes.map(q => ({ symbol: q.symbol, changePercent: q.changePercent })),
      breadth: `${bullCount}/${sectorQuotes.length} green`,
    };
  }

  return sectorResults;
}

export function getBiasEmoji(bias) {
  switch (bias) {
    case 'STRONG BULLISH': return '\uD83D\uDFE2\uD83D\uDFE2';
    case 'BULLISH': return '\uD83D\uDFE2';
    case 'NEUTRAL': return '\uD83D\uDFE1';
    case 'BEARISH': return '\uD83D\uDD34';
    case 'STRONG BEARISH': return '\uD83D\uDD34\uD83D\uDD34';
    default: return '\u26AA';
  }
}
