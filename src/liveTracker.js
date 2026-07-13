import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { fetchAllQuotes, fetchQQQ, fetchNQFutures, fetchESFutures, fetchSPY } from './stockData.js';
import { calculateBias } from './biasAnalysis.js';
import {
  biasHeader, biasMeter, percentBar, breadthVisual,
  getBiasColorPremium, marketStateDisplay, formatChange, formatPrice,
  formatVolume, getArrow, DOT, COLORS,
} from './visuals.js';

const activeLiveEmbeds = new Map();
const activeLiveSessions = new Map();

const LIVE_UPDATE_INTERVAL = 30_000;
const MAX_LIVE_DURATION = 4 * 60 * 60_000;
const TICKER_ROTATION_INTERVAL = 15_000;

let tickerInterval = null;
let tickerIndex = 0;

// ─── Live Bias ───────────────────────────────────────────────────────────────

export async function startLiveBias(interaction) {
  await interaction.deferReply();
  const payload = await buildLiveBiasPayload();
  const message = await interaction.editReply(payload);

  const interval = setInterval(async () => {
    try {
      const updated = await buildLiveBiasPayload();
      await message.edit(updated);
    } catch (err) {
      if (err.code === 10008 || err.code === 50001) stopLiveEmbed(message.id);
    }
  }, LIVE_UPDATE_INTERVAL);

  const timeout = setTimeout(() => stopLiveEmbed(message.id), MAX_LIVE_DURATION);

  activeLiveEmbeds.set(message.id, {
    message, interval, timeout, type: 'bias',
    startedAt: Date.now(), channelId: interaction.channelId,
  });
}

async function buildLiveBiasPayload() {
  const [quotes, qqq, nq, es, spy] = await Promise.all([fetchAllQuotes(), fetchQQQ(), fetchNQFutures(), fetchESFutures(), fetchSPY()]);
  const analysis = calculateBias(quotes);
  const color = getBiasColorPremium(analysis.bias);
  const now = new Date();

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: '\u26A1 NQ BIAS ENGINE \u2022 LIVE' })
    .setTimestamp()
    .setFooter({ text: `\uD83D\uDD34 LIVE \u2022 Updates every 30s \u2022 Last: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` });

  const header = biasHeader(analysis.bias);
  const scoreStr = formatChange(analysis.score, 3);
  const meter = biasMeter(analysis.score);

  let desc = header + '\n';
  desc += `> **Weighted Bias Score:** \`${scoreStr}\`\n`;
  desc += `> **Strength Meter:** ${meter}\n`;
  desc += `> ${breadthVisual(analysis.breadth.bullish, analysis.breadth.bearish, analysis.breadth.total)}\n`;
  desc += `> \`${analysis.breadth.bullish}\` Green ${DOT} \`${analysis.breadth.bearish}\` Red ${DOT} \`${analysis.breadth.neutral}\` Flat \u2014 **${(analysis.breadth.ratio * 100).toFixed(0)}%** Bull Ratio\n`;
  embed.setDescription(desc);

  let futuresStr = '';
  if (nq) futuresStr += `${getArrow(nq.changePercent)} **NQ** \u2502 ${formatPrice(nq.price)} \u2502 \`${formatChange(nq.changePercent)}\`\n`;
  if (es) futuresStr += `${getArrow(es.changePercent)} **ES** \u2502 ${formatPrice(es.price)} \u2502 \`${formatChange(es.changePercent)}\`\n`;
  if (qqq) futuresStr += `${getArrow(qqq.changePercent)} **QQQ** \u2502 ${formatPrice(qqq.price)} \u2502 \`${formatChange(qqq.changePercent)}\`\n`;
  if (spy) futuresStr += `${getArrow(spy.changePercent)} **SPY** \u2502 ${formatPrice(spy.price)} \u2502 \`${formatChange(spy.changePercent)}\`\n`;
  if (futuresStr) {
    futuresStr += `\n${marketStateDisplay(qqq?.marketState || nq?.marketState)}`;
    embed.addFields({ name: '\uD83C\uDFCE\uFE0F INDEX & FUTURES', value: futuresStr, inline: false });
  }

  if (analysis.topMovers.length > 0) {
    let moversStr = '';
    for (const stock of analysis.topMovers) {
      const arrow = getArrow(stock.changePercent);
      const bar = percentBar(stock.changePercent);
      moversStr += `${arrow} **${stock.symbol}** \`${formatChange(stock.changePercent)}\` ${bar} \u2502 ${formatPrice(stock.price)}\n`;
    }
    embed.addFields({ name: '\uD83D\uDD25 TOP MOVERS', value: moversStr, inline: false });
  }

  let context = '';
  if (analysis.bias.includes('BULLISH')) context = '```diff\n+ BULLISH — Favor longs on NQ\n```';
  else if (analysis.bias.includes('BEARISH')) context = '```diff\n- BEARISH — Favor shorts on NQ\n```';
  else context = '```fix\n~ NEUTRAL — No clear edge\n```';
  embed.addFields({ name: '\uD83C\uDFAF BIAS', value: context, inline: false });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('live_stop').setLabel('Stop Live').setStyle(ButtonStyle.Danger).setEmoji('\u23F9\uFE0F'),
    new ButtonBuilder().setCustomId('refresh_bias').setLabel('Force Refresh').setStyle(ButtonStyle.Secondary).setEmoji('\uD83D\uDD04'),
  );

  return { embeds: [embed], components: [row] };
}

// ─── Live Futures ────────────────────────────────────────────────────────────

export async function startLiveFutures(interaction) {
  await interaction.deferReply();
  const payload = await buildLiveFuturesPayload();
  const message = await interaction.editReply(payload);

  const interval = setInterval(async () => {
    try {
      const updated = await buildLiveFuturesPayload();
      await message.edit(updated);
    } catch (err) {
      if (err.code === 10008 || err.code === 50001) stopLiveEmbed(message.id);
    }
  }, LIVE_UPDATE_INTERVAL);

  const timeout = setTimeout(() => stopLiveEmbed(message.id), MAX_LIVE_DURATION);

  activeLiveEmbeds.set(message.id, {
    message, interval, timeout, type: 'futures',
    startedAt: Date.now(), channelId: interaction.channelId,
  });
}

async function buildLiveFuturesPayload() {
  const [nq, es, qqq, spy] = await Promise.all([fetchNQFutures(), fetchESFutures(), fetchQQQ(), fetchSPY()]);
  const now = new Date();

  const embed = new EmbedBuilder()
    .setColor(COLORS.FUTURES)
    .setAuthor({ name: '\uD83D\uDCC8 FUTURES & ETFs \u2022 LIVE FEED' })
    .setTimestamp()
    .setFooter({ text: `\uD83D\uDD34 LIVE \u2022 Updates every 30s \u2022 ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` });

  let desc = '';
  if (nq) {
    const c = nq.changePercent >= 0 ? '\u001b[1;32m' : '\u001b[1;31m';
    desc += '```ansi\n';
    desc += `\u001b[1;37m\u2554${'═'.repeat(31)}\u2557\n`;
    desc += `\u2551  NQ FUTURES (NQ=F)          \u2551\n`;
    desc += `\u2551  ${c}${formatPrice(nq.price).padEnd(12)} ${formatChange(nq.changePercent).padEnd(10)}\u001b[0m  \u2551\n`;
    desc += `\u2551  H: ${formatPrice(nq.dayHigh)}  L: ${formatPrice(nq.dayLow)}  \u2551\n`;
    desc += `\u255A${'═'.repeat(31)}\u255D\n\`\`\`\n`;
  }
  if (es) {
    const c = es.changePercent >= 0 ? '\u001b[1;32m' : '\u001b[1;31m';
    desc += '```ansi\n';
    desc += `\u001b[1;37m\u2554${'═'.repeat(31)}\u2557\n`;
    desc += `\u2551  ES FUTURES (ES=F)          \u2551\n`;
    desc += `\u2551  ${c}${formatPrice(es.price).padEnd(12)} ${formatChange(es.changePercent).padEnd(10)}\u001b[0m  \u2551\n`;
    desc += `\u2551  H: ${formatPrice(es.dayHigh)}  L: ${formatPrice(es.dayLow)}  \u2551\n`;
    desc += `\u255A${'═'.repeat(31)}\u255D\n\`\`\`\n`;
  }
  if (qqq) {
    const c = qqq.changePercent >= 0 ? '\u001b[1;32m' : '\u001b[1;31m';
    desc += '```ansi\n';
    desc += `\u001b[1;37m\u2554${'═'.repeat(31)}\u2557\n`;
    desc += `\u2551  QQQ ETF                    \u2551\n`;
    desc += `\u2551  ${c}${formatPrice(qqq.price).padEnd(12)} ${formatChange(qqq.changePercent).padEnd(10)}\u001b[0m  \u2551\n`;
    desc += `\u2551  Vol: ${formatVolume(qqq.volume).padEnd(24)}\u2551\n`;
    desc += `\u255A${'═'.repeat(31)}\u255D\n\`\`\`\n`;
  }
  if (spy) {
    const c = spy.changePercent >= 0 ? '\u001b[1;32m' : '\u001b[1;31m';
    desc += '```ansi\n';
    desc += `\u001b[1;37m\u2554${'═'.repeat(31)}\u2557\n`;
    desc += `\u2551  SPY ETF                    \u2551\n`;
    desc += `\u2551  ${c}${formatPrice(spy.price).padEnd(12)} ${formatChange(spy.changePercent).padEnd(10)}\u001b[0m  \u2551\n`;
    desc += `\u2551  Vol: ${formatVolume(spy.volume).padEnd(24)}\u2551\n`;
    desc += `\u255A${'═'.repeat(31)}\u255D\n\`\`\`\n`;
  }
  desc += `${marketStateDisplay(qqq?.marketState || nq?.marketState)}`;
  embed.setDescription(desc);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('live_stop').setLabel('Stop Live').setStyle(ButtonStyle.Danger).setEmoji('\u23F9\uFE0F'),
  );
  return { embeds: [embed], components: [row] };
}

// ─── Scheduled Channel Updates ───────────────────────────────────────────────

export async function startScheduledUpdates(channel, intervalMinutes = 5) {
  const channelId = channel.id;
  if (activeLiveSessions.has(channelId)) {
    return { success: false, reason: 'Already running in this channel' };
  }

  const intervalMs = intervalMinutes * 60_000;
  const payload = await buildScheduledPayload();
  await channel.send(payload);

  const interval = setInterval(async () => {
    try {
      const p = await buildScheduledPayload();
      await channel.send(p);
    } catch (err) {
      if (err.code === 50001 || err.code === 10003) stopScheduledUpdates(channelId);
    }
  }, intervalMs);

  activeLiveSessions.set(channelId, { interval, startedAt: Date.now(), intervalMinutes, channelId });
  return { success: true, intervalMinutes };
}

async function buildScheduledPayload() {
  const [quotes, nq, es] = await Promise.all([fetchAllQuotes(), fetchNQFutures(), fetchESFutures()]);
  const analysis = calculateBias(quotes);
  const color = getBiasColorPremium(analysis.bias);
  const now = new Date();

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: '\uD83D\uDCE1 SCHEDULED BIAS UPDATE' })
    .setTimestamp()
    .setFooter({ text: `Auto-posted \u2022 ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` });

  const meter = biasMeter(analysis.score);
  let desc = `**Bias:** ${getBiasEmoji(analysis.bias)} **${analysis.bias}** \`${formatChange(analysis.score, 3)}\`\n`;
  desc += `**Meter:** ${meter}\n`;
  desc += `${breadthVisual(analysis.breadth.bullish, analysis.breadth.bearish, analysis.breadth.total)}\n`;
  if (nq) desc += `\n${getArrow(nq.changePercent)} **NQ:** ${formatPrice(nq.price)} \`${formatChange(nq.changePercent)}\``;
  if (es) desc += `\n${getArrow(es.changePercent)} **ES:** ${formatPrice(es.price)} \`${formatChange(es.changePercent)}\``;
  if (analysis.topMovers.length > 0) {
    desc += '\n\n**Movers:** ';
    desc += analysis.topMovers.slice(0, 3).map(s => `${getArrow(s.changePercent)} ${s.symbol} \`${formatChange(s.changePercent)}\``).join(' ');
  }
  embed.setDescription(desc);
  return { embeds: [embed] };
}

function getBiasEmoji(bias) {
  switch (bias) {
    case 'STRONG BULLISH': return '\uD83D\uDFE2\uD83D\uDFE2';
    case 'BULLISH': return '\uD83D\uDFE2';
    case 'NEUTRAL': return '\uD83D\uDFE1';
    case 'BEARISH': return '\uD83D\uDD34';
    case 'STRONG BEARISH': return '\uD83D\uDD34\uD83D\uDD34';
    default: return '\u26AA';
  }
}

// ─── Ticker Rotation ─────────────────────────────────────────────────────────

export function startTickerRotation(client) {
  if (tickerInterval) return;

  const updateTicker = async () => {
    try {
      const [nq, es, qqq] = await Promise.all([fetchNQFutures(), fetchESFutures(), fetchQQQ()]);
      const quotes = await fetchAllQuotes();
      const analysis = calculateBias(quotes);

      const statuses = [];
      if (nq) statuses.push(`NQ ${formatPrice(nq.price)} (${formatChange(nq.changePercent)})`);
      if (es) statuses.push(`ES ${formatPrice(es.price)} (${formatChange(es.changePercent)})`);
      if (qqq) statuses.push(`QQQ ${formatPrice(qqq.price)} (${formatChange(qqq.changePercent)})`);
      statuses.push(`Bias: ${analysis.bias} | ${formatChange(analysis.score, 2)}`);
      statuses.push(`${analysis.breadth.bullish}/${analysis.breadth.total} Green | /bias`);

      client.user.setActivity(statuses[tickerIndex % statuses.length], { type: 3 });
      tickerIndex++;
    } catch {
      client.user.setActivity('NQ & ES Futures | /bias', { type: 3 });
    }
  };

  updateTicker();
  tickerInterval = setInterval(updateTicker, TICKER_ROTATION_INTERVAL);
}

export function stopTickerRotation(client) {
  if (tickerInterval) { clearInterval(tickerInterval); tickerInterval = null; }
  client.user.setActivity('NQ Futures | /bias', { type: 3 });
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

export function stopLiveEmbed(messageId) {
  const session = activeLiveEmbeds.get(messageId);
  if (!session) return false;
  clearInterval(session.interval);
  if (session.timeout) clearTimeout(session.timeout);
  activeLiveEmbeds.delete(messageId);
  try {
    const embed = new EmbedBuilder().setColor(COLORS.DARK)
      .setDescription('\u23F9\uFE0F **Live feed stopped.** Use `/live` to start a new one.').setTimestamp();
    session.message.edit({ embeds: [embed], components: [] }).catch(() => {});
  } catch {}
  return true;
}

export function stopScheduledUpdates(channelId) {
  const session = activeLiveSessions.get(channelId);
  if (!session) return false;
  clearInterval(session.interval);
  activeLiveSessions.delete(channelId);
  return true;
}

export function findAndStopByChannel(channelId) {
  let stopped = 0;
  for (const [id, session] of activeLiveEmbeds) {
    if (session.channelId === channelId) { stopLiveEmbed(id); stopped++; }
  }
  if (activeLiveSessions.has(channelId)) { stopScheduledUpdates(channelId); stopped++; }
  return stopped;
}

export function getLiveStatus() {
  const embeds = [];
  for (const [id, s] of activeLiveEmbeds) {
    embeds.push({ id, type: s.type, channel: s.channelId, running: `${Math.floor((Date.now() - s.startedAt) / 60_000)}m` });
  }
  const scheduled = [];
  for (const [id, s] of activeLiveSessions) {
    scheduled.push({ channel: s.channelId, interval: `${s.intervalMinutes}m`, running: `${Math.floor((Date.now() - s.startedAt) / 60_000)}m` });
  }
  return { embeds, scheduled, tickerActive: !!tickerInterval };
}

export function stopAll() {
  for (const [id, s] of activeLiveEmbeds) { clearInterval(s.interval); if (s.timeout) clearTimeout(s.timeout); }
  activeLiveEmbeds.clear();
  for (const [id, s] of activeLiveSessions) { clearInterval(s.interval); }
  activeLiveSessions.clear();
  if (tickerInterval) { clearInterval(tickerInterval); tickerInterval = null; }
}
