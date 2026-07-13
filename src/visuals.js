/**
 * Visual formatting utilities for premium-looking Discord embeds
 */

export function biasMeter(score, width = 15) {
  const clamped = Math.max(-2, Math.min(2, score));
  const normalized = (clamped + 2) / 4;
  const center = Math.floor(width / 2);

  let bar = '';
  for (let i = 0; i < width; i++) {
    if (i === center) {
      bar += '\u2502';
    } else if (score >= 0) {
      if (i > center && i <= center + Math.round((normalized - 0.5) * 2 * (width - center))) {
        bar += '\u2588';
      } else {
        bar += '\u2500';
      }
    } else {
      if (i < center && i >= center - Math.round((0.5 - normalized) * 2 * center)) {
        bar += '\u2588';
      } else {
        bar += '\u2500';
      }
    }
  }
  return `\`${bar}\``;
}

export function percentBar(percent, maxPercent = 5) {
  const width = 8;
  const absPct = Math.min(Math.abs(percent), maxPercent);
  const filled = Math.round((absPct / maxPercent) * width);
  let bar = '';
  for (let i = 0; i < width; i++) {
    bar += i < filled ? '\u25B0' : '\u25B1';
  }
  return bar;
}

export function formatChange(value, decimals = 2) {
  if (value == null) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatPrice(value) {
  if (value == null) return 'N/A';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatVolume(vol) {
  if (vol == null) return 'N/A';
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return vol.toString();
}

export function getArrow(changePercent) {
  if (changePercent == null) return '\u25CF';
  if (changePercent >= 2) return '\u25B2\u25B2';
  if (changePercent >= 0.5) return '\u25B2';
  if (changePercent > 0) return '\u25B3';
  if (changePercent <= -2) return '\u25BC\u25BC';
  if (changePercent <= -0.5) return '\u25BC';
  if (changePercent < 0) return '\u25BD';
  return '\u25CF';
}

export function biasHeader(bias) {
  switch (bias) {
    case 'STRONG BULLISH':
      return '```ansi\n\u001b[1;32m\u2588\u2588\u2588 STRONG BULLISH \u2588\u2588\u2588\n\u001b[0;32m    \u25B2 \u25B2 \u25B2 \u25B2 \u25B2\n```';
    case 'BULLISH':
      return '```ansi\n\u001b[1;32m\u2593\u2593\u2593 BULLISH \u2593\u2593\u2593\n\u001b[0;32m     \u25B2 \u25B2 \u25B2\n```';
    case 'NEUTRAL':
      return '```ansi\n\u001b[1;33m\u2592\u2592\u2592 NEUTRAL \u2592\u2592\u2592\n\u001b[0;33m    \u25C6 \u25C6 \u25C6\n```';
    case 'BEARISH':
      return '```ansi\n\u001b[1;31m\u2593\u2593\u2593 BEARISH \u2593\u2593\u2593\n\u001b[0;31m     \u25BC \u25BC \u25BC\n```';
    case 'STRONG BEARISH':
      return '```ansi\n\u001b[1;31m\u2588\u2588\u2588 STRONG BEARISH \u2588\u2588\u2588\n\u001b[0;31m    \u25BC \u25BC \u25BC \u25BC \u25BC\n```';
    default:
      return '```ansi\n\u001b[1;37m\u2592\u2592\u2592 LOADING \u2592\u2592\u2592\n```';
  }
}

export const DIVIDER = '\u2500'.repeat(32);
export const DIVIDER_THIN = '\u2508'.repeat(32);
export const BULLET = '\u25B8';
export const DOT = '\u2022';

export const COLORS = {
  STRONG_BULL: 0x00d26a,
  BULL: 0x2ecc71,
  NEUTRAL: 0xf39c12,
  BEAR: 0xe74c3c,
  STRONG_BEAR: 0xc0392b,
  ACCENT: 0x9b59b6,
  INFO: 0x3498db,
  DARK: 0x2c3e50,
  FUTURES: 0x1abc9c,
  WATCHLIST: 0x8e44ad,
};

export function getBiasColorPremium(bias) {
  switch (bias) {
    case 'STRONG BULLISH': return COLORS.STRONG_BULL;
    case 'BULLISH': return COLORS.BULL;
    case 'NEUTRAL': return COLORS.NEUTRAL;
    case 'BEARISH': return COLORS.BEAR;
    case 'STRONG BEARISH': return COLORS.STRONG_BEAR;
    default: return COLORS.DARK;
  }
}

export function getBiasIcon(bias) {
  switch (bias) {
    case 'STRONG BULLISH': return '\uD83D\uDCC8\uD83D\uDFE2';
    case 'BULLISH': return '\uD83D\uDCC8';
    case 'NEUTRAL': return '\u2696\uFE0F';
    case 'BEARISH': return '\uD83D\uDCC9';
    case 'STRONG BEARISH': return '\uD83D\uDCC9\uD83D\uDD34';
    default: return '\u2753';
  }
}

export function marketStateDisplay(state) {
  switch (state) {
    case 'REGULAR': return '\uD83D\uDFE2 Market Open';
    case 'PRE': return '\uD83C\uDF05 Pre-Market';
    case 'POST': return '\uD83C\uDF03 After Hours';
    case 'CLOSED': return '\uD83D\uDD34 Market Closed';
    default: return `\u26AA ${state || 'Unknown'}`;
  }
}

export function buildWatchlistTable(holdings, quotes) {
  const sortedHoldings = [...holdings].sort((a, b) => b.weight - a.weight);

  let table = '```ansi\n';
  table += '\u001b[1;37m TICKER  \u2502 PRICE     \u2502 CHANGE    \u2502 WEIGHT\n';
  table += '\u001b[0;90m\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n';

  for (const holding of sortedHoldings) {
    const quote = quotes.find(q => q.symbol === holding.symbol);
    if (!quote) continue;

    const pct = quote.changePercent || 0;
    const colorCode = pct >= 0 ? '\u001b[1;32m' : '\u001b[1;31m';
    const sign = pct >= 0 ? '+' : '';
    const arrow = pct >= 0 ? '\u25B2' : '\u25BC';

    const sym = holding.symbol.padEnd(7);
    const price = `$${quote.price?.toFixed(2)}`.padEnd(9);
    const change = `${arrow}${sign}${pct.toFixed(2)}%`.padEnd(9);
    const weight = `${holding.weight}%`;

    table += `${colorCode} ${sym}\u001b[0m\u2502 ${price} \u2502 ${colorCode}${change}\u001b[0m\u2502 ${weight}\n`;
  }

  table += '```';
  return table;
}

export function buildSectorBlock(sectorName, data) {
  const icon = getSectorIcon(sectorName);
  const biasTag = getBiasTag(data.bias);
  const sign = data.avgChange >= 0 ? '+' : '';

  let block = `${icon} **${sectorName}** ${biasTag}\n`;
  block += `\u2502 Avg: \`${sign}${data.avgChange.toFixed(2)}%\` ${DOT} ${data.breadth}\n`;
  block += `\u2502 `;
  block += data.stocks.map(s => {
    const sSign = s.changePercent >= 0 ? '+' : '';
    return `\`${s.symbol} ${sSign}${s.changePercent?.toFixed(2)}%\``;
  }).join(` ${DOT} `);

  return block;
}

function getSectorIcon(sector) {
  switch (sector) {
    case 'Big Tech': return '\uD83C\uDFE2';
    case 'Semiconductors': return '\uD83E\uDDE0';
    case 'Consumer/Growth': return '\uD83D\uDE80';
    case 'Software': return '\uD83D\uDCBB';
    default: return '\uD83D\uDCCA';
  }
}

function getBiasTag(bias) {
  switch (bias) {
    case 'STRONG BULLISH': return '`\uD83D\uDFE2 STRONG BULL`';
    case 'BULLISH': return '`\uD83D\uDFE2 BULL`';
    case 'NEUTRAL': return '`\uD83D\uDFE1 NEUTRAL`';
    case 'BEARISH': return '`\uD83D\uDD34 BEAR`';
    case 'STRONG BEARISH': return '`\uD83D\uDD34 STRONG BEAR`';
    default: return '`\u26AA UNKNOWN`';
  }
}

export function breadthVisual(bullish, bearish, total) {
  const neutral = total - bullish - bearish;
  let visual = '';
  for (let i = 0; i < bullish; i++) visual += '\uD83D\uDFE2';
  for (let i = 0; i < neutral; i++) visual += '\u26AA';
  for (let i = 0; i < bearish; i++) visual += '\uD83D\uDD34';
  return visual;
}

export function getTimestampLine() {
  const now = new Date();
  return `\u23F0 ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}`;
}
