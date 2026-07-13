import { Client, GatewayIntentBits, EmbedBuilder, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import dotenv from 'dotenv';
import { fetchAllQuotes, fetchQuote, fetchQQQ, fetchNQFutures } from './stockData.js';
import { calculateBias, calculateSectorBias, getBiasEmoji } from './biasAnalysis.js';
import { NQ_HOLDINGS } from './config.js';
import {
  biasHeader, biasMeter, percentBar, breadthVisual, buildWatchlistTable,
  buildSectorBlock, getBiasColorPremium, marketStateDisplay,
  formatChange, formatPrice, formatVolume, getArrow,
  DIVIDER_THIN, BULLET, DOT, COLORS,
} from './visuals.js';
import {
  startLiveBias, startLiveFutures, startScheduledUpdates,
  startTickerRotation, stopLiveEmbed, findAndStopByChannel,
  getLiveStatus, stopAll,
} from './liveTracker.js';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const BOT_FOOTER = { text: '\u2022 NQPulse \u2022 Live Market Data \u2022 Not Financial Advice' };

// ─── Bot Ready ───────────────────────────────────────────────────────────────

client.once(Events.ClientReady, (readyClient) => {
  console.log('\u2501'.repeat(38));
  console.log('  \u26A1 NQPULSE ENGINE ONLINE');
  console.log(`  \u2022 Bot: ${readyClient.user.tag}`);
  console.log(`  \u2022 Tracking: ${NQ_HOLDINGS.length} NQ/QQQ holdings`);
  console.log('  \u2022 Mode: REAL-TIME LIVE UPDATES');
  console.log('\u2501'.repeat(38));
  startTickerRotation(client);
});

// ─── Interactions ────────────────────────────────────────────────────────────

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;
    try {
      switch (commandName) {
        case 'bias': await handleBias(interaction); break;
        case 'live': await handleLive(interaction); break;
        case 'autoupdate': await handleAutoUpdate(interaction); break;
        case 'stock': await handleStock(interaction); break;
        case 'watchlist': await handleWatchlist(interaction); break;
        case 'sectors': await handleSectors(interaction); break;
        case 'futures': await handleFutures(interaction); break;
        case 'status': await handleStatus(interaction); break;
        default: await interaction.reply({ content: 'Unknown command.', ephemeral: true });
      }
    } catch (error) {
      console.error(`Error /${commandName}:`, error);
      const r = { content: '\u274C Error fetching market data. Try again.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(r);
      else await interaction.reply(r);
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'refresh_bias') await handleBias(interaction, true);
    if (interaction.customId === 'live_stop') {
      const stopped = stopLiveEmbed(interaction.message.id);
      if (stopped) await interaction.deferUpdate();
      else await interaction.reply({ content: 'Feed already stopped.', ephemeral: true });
    }
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /bias
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleBias(interaction, isRefresh = false) {
  if (isRefresh) await interaction.deferUpdate();
  else await interaction.deferReply();

  const [quotes, qqq, nq] = await Promise.all([fetchAllQuotes(), fetchQQQ(), fetchNQFutures()]);
  const analysis = calculateBias(quotes);
  const color = getBiasColorPremium(analysis.bias);
  const now = new Date();

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: '\u26A1 NQ BIAS ENGINE' })
    .setTimestamp()
    .setFooter({ text: `Updated ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} \u2022 NQPulse` });

  let desc = biasHeader(analysis.bias) + '\n';
  desc += `> **Weighted Bias Score:** \`${formatChange(analysis.score, 3)}\`\n`;
  desc += `> **Strength Meter:** ${biasMeter(analysis.score)}\n`;
  desc += `> **Market Breadth:**\n`;
  desc += `> ${breadthVisual(analysis.breadth.bullish, analysis.breadth.bearish, analysis.breadth.total)}\n`;
  desc += `> \`${analysis.breadth.bullish}\` Green ${DOT} \`${analysis.breadth.bearish}\` Red ${DOT} \`${analysis.breadth.neutral}\` Flat \u2014 **${(analysis.breadth.ratio * 100).toFixed(0)}%** Bull Ratio\n`;
  embed.setDescription(desc);

  // Futures
  let futStr = '';
  if (nq) futStr += `${getArrow(nq.changePercent)} **NQ Futures** \u2502 ${formatPrice(nq.price)} \u2502 \`${formatChange(nq.changePercent)}\`\n`;
  if (qqq) futStr += `${getArrow(qqq.changePercent)} **QQQ ETF** \u2502 ${formatPrice(qqq.price)} \u2502 \`${formatChange(qqq.changePercent)}\`\n`;
  if (futStr) {
    futStr += `\n${marketStateDisplay(qqq?.marketState || nq?.marketState)}`;
    embed.addFields({ name: '\uD83C\uDFCE\uFE0F \u2502 INDEX & FUTURES', value: futStr, inline: false });
  }

  // Top movers
  if (analysis.topMovers.length > 0) {
    let m = '';
    for (const s of analysis.topMovers) {
      m += `${getArrow(s.changePercent)} **${s.symbol}** \`${formatChange(s.changePercent)}\` ${percentBar(s.changePercent)} \u2502 ${formatPrice(s.price)} \u2502 _${s.weight}% wt_\n`;
    }
    embed.addFields({ name: '\uD83D\uDD25 \u2502 TOP MOVERS BY IMPACT', value: m, inline: false });
  }

  // Context
  let ctx = '';
  if (analysis.bias === 'STRONG BULLISH') ctx = '```diff\n+ STRONG BUY PRESSURE\n+ Major holdings ripping \u2014 long bias NQ\n```';
  else if (analysis.bias === 'BULLISH') ctx = '```diff\n+ BULLISH LEAN \u2014 favor longs on NQ\n```';
  else if (analysis.bias === 'STRONG BEARISH') ctx = '```diff\n- HEAVY SELL PRESSURE\n- Major holdings dumping \u2014 short bias NQ\n```';
  else if (analysis.bias === 'BEARISH') ctx = '```diff\n- BEARISH LEAN \u2014 favor shorts on NQ\n```';
  else ctx = '```fix\n~ NEUTRAL / CHOPPY \u2014 no clear edge\n```';
  embed.addFields({ name: '\uD83C\uDFAF \u2502 TRADING CONTEXT', value: ctx, inline: false });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('refresh_bias').setLabel('Refresh').setStyle(ButtonStyle.Secondary).setEmoji('\uD83D\uDD04'),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /live
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleLive(interaction) {
  const type = interaction.options.getString('type') || 'bias';
  if (type === 'futures') await startLiveFutures(interaction);
  else await startLiveBias(interaction);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /autoupdate
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleAutoUpdate(interaction) {
  const action = interaction.options.getString('action');
  const interval = interaction.options.getInteger('interval') || 5;

  if (action === 'stop') {
    const stopped = findAndStopByChannel(interaction.channelId);
    await interaction.reply({ content: stopped > 0 ? `\u23F9\uFE0F Stopped ${stopped} feed(s).` : '\u26A0\uFE0F No active feeds here.', ephemeral: true });
    return;
  }

  const result = await startScheduledUpdates(interaction.channel, interval);
  if (result.success) {
    const embed = new EmbedBuilder().setColor(COLORS.STRONG_BULL)
      .setDescription(`\uD83D\uDD34 **LIVE AUTO-UPDATES STARTED**\n\n\u2022 Interval: Every **${interval} minutes**\n\u2022 Channel: <#${interaction.channelId}>\n\u2022 Use \`/autoupdate action:stop\` to stop.`)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  } else {
    await interaction.reply({ content: `\u26A0\uFE0F ${result.reason}`, ephemeral: true });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /stock
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleStock(interaction) {
  await interaction.deferReply();
  const symbol = interaction.options.getString('symbol').toUpperCase();
  const quote = await fetchQuote(symbol);

  if (!quote) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.BEAR).setDescription(`\u274C Could not fetch \`${symbol}\``)] });
    return;
  }

  const holding = NQ_HOLDINGS.find(h => h.symbol === symbol);
  const pct = quote.changePercent || 0;
  const color = pct >= 0 ? COLORS.BULL : COLORS.BEAR;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${getArrow(pct)} ${symbol}` })
    .setTitle(formatPrice(quote.price))
    .setTimestamp().setFooter(BOT_FOOTER);

  let desc = '```ansi\n';
  desc += pct >= 0 ? `\u001b[1;32m${getArrow(pct)} ${formatChange(pct)}  ($${quote.change?.toFixed(2)})\u001b[0m\n` : `\u001b[1;31m${getArrow(pct)} ${formatChange(pct)}  ($${quote.change?.toFixed(2)})\u001b[0m\n`;
  desc += '```\n';
  desc += `${percentBar(pct)}\n\n`;
  desc += `${BULLET} **Day Range**\n> \`${formatPrice(quote.dayLow)}\` \u2500\u2500\u2500\u2500 \`${formatPrice(quote.dayHigh)}\`\n\n`;
  desc += `${BULLET} **Prev Close:** ${formatPrice(quote.previousClose)}\n`;
  desc += `${BULLET} **Volume:** \`${formatVolume(quote.volume)}\`\n`;
  desc += `${BULLET} **Session:** ${marketStateDisplay(quote.marketState)}\n`;
  if (holding) desc += `\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\uD83C\uDFAF **QQQ Component** \u2502 Weight: \`${holding.weight}%\` \u2502 ${holding.name}`;

  embed.setDescription(desc);
  await interaction.editReply({ embeds: [embed] });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /watchlist
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleWatchlist(interaction) {
  await interaction.deferReply();
  const quotes = await fetchAllQuotes();
  const analysis = calculateBias(quotes);

  const embed = new EmbedBuilder().setColor(COLORS.WATCHLIST)
    .setAuthor({ name: '\uD83D\uDCCB NQ/QQQ TOP HOLDINGS' }).setTimestamp().setFooter(BOT_FOOTER);

  const green = quotes.filter(q => (q.changePercent || 0) > 0).length;
  const red = quotes.filter(q => (q.changePercent || 0) < 0).length;

  let header = `${breadthVisual(green, red, quotes.length)}\n`;
  header += `**${green}** advancing ${DOT} **${red}** declining ${DOT} **${quotes.length - green - red}** flat\n`;
  header += `Overall Bias: **${analysis.bias}** \`${formatChange(analysis.score, 3)}\`\n`;
  embed.setDescription(header);

  embed.addFields({ name: '\u200B', value: buildWatchlistTable(NQ_HOLDINGS, quotes), inline: false });

  const sorted = [...quotes].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
  const gainers = sorted.slice(0, 3).map(q => `\u25B2 **${q.symbol}** \`${formatChange(q.changePercent)}\``).join('\n');
  const losers = sorted.slice(-3).reverse().map(q => `\u25BC **${q.symbol}** \`${formatChange(q.changePercent)}\``).join('\n');
  embed.addFields({ name: '\uD83D\uDE80 Top Gainers', value: gainers || 'N/A', inline: true }, { name: '\uD83E\uDE82 Top Losers', value: losers || 'N/A', inline: true });

  await interaction.editReply({ embeds: [embed] });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /sectors
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleSectors(interaction) {
  await interaction.deferReply();
  const quotes = await fetchAllQuotes();
  const sectorBias = calculateSectorBias(quotes);
  const overall = calculateBias(quotes);

  const embed = new EmbedBuilder().setColor(COLORS.INFO)
    .setAuthor({ name: '\uD83C\uDFDB\uFE0F SECTOR ROTATION ANALYSIS' }).setTimestamp().setFooter(BOT_FOOTER);

  embed.setDescription(`> Overall NQ Bias: **${overall.bias}** \`${formatChange(overall.score, 3)}\`\n> ${DIVIDER_THIN}\n`);

  for (const [sector, data] of Object.entries(sectorBias)) {
    embed.addFields({ name: '\u200B', value: buildSectorBlock(sector, data), inline: false });
  }

  const sectors = Object.entries(sectorBias).sort((a, b) => b[1].avgChange - a[1].avgChange);
  if (sectors.length >= 2) {
    embed.addFields({ name: '\u2500\u2500\u2500 ROTATION \u2500\u2500\u2500', value: `\uD83C\uDFC6 **Leading:** ${sectors[0][0]} (\`${formatChange(sectors[0][1].avgChange)}\`)\n\uD83E\uDE82 **Lagging:** ${sectors.at(-1)[0]} (\`${formatChange(sectors.at(-1)[1].avgChange)}\`)`, inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /futures
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleFutures(interaction) {
  await interaction.deferReply();
  const [nq, qqq] = await Promise.all([fetchNQFutures(), fetchQQQ()]);

  const embed = new EmbedBuilder().setColor(COLORS.FUTURES)
    .setAuthor({ name: '\uD83D\uDCC8 NQ FUTURES & QQQ' }).setTimestamp().setFooter(BOT_FOOTER);

  let desc = '';
  if (nq) {
    const c = nq.changePercent >= 0 ? '\u001b[1;32m' : '\u001b[1;31m';
    desc += `\`\`\`ansi\n\u001b[1;37m\u2554${'═'.repeat(31)}\u2557\n\u2551  NQ FUTURES (NQ=F)          \u2551\n\u2551  ${c}${formatPrice(nq.price).padEnd(12)} ${formatChange(nq.changePercent).padEnd(10)}\u001b[0m  \u2551\n\u2551  Range: ${formatPrice(nq.dayLow)} - ${formatPrice(nq.dayHigh)}  \u2551\n\u255A${'═'.repeat(31)}\u255D\n\`\`\`\n`;
  }
  if (qqq) {
    const c = qqq.changePercent >= 0 ? '\u001b[1;32m' : '\u001b[1;31m';
    desc += `\`\`\`ansi\n\u001b[1;37m\u2554${'═'.repeat(31)}\u2557\n\u2551  QQQ ETF                    \u2551\n\u2551  ${c}${formatPrice(qqq.price).padEnd(12)} ${formatChange(qqq.changePercent).padEnd(10)}\u001b[0m  \u2551\n\u2551  Vol: ${formatVolume(qqq.volume).padEnd(24)}\u2551\n\u255A${'═'.repeat(31)}\u255D\n\`\`\`\n`;
  }
  desc += `\n${marketStateDisplay(qqq?.marketState || nq?.marketState)}`;
  embed.setDescription(desc);

  await interaction.editReply({ embeds: [embed] });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleStatus(interaction) {
  const status = getLiveStatus();
  const embed = new EmbedBuilder().setColor(COLORS.INFO)
    .setAuthor({ name: '\uD83D\uDCE1 LIVE FEED STATUS' }).setTimestamp().setFooter(BOT_FOOTER);

  let desc = `**Ticker:** ${status.tickerActive ? '\uD83D\uDFE2 Active' : '\uD83D\uDD34 Off'}\n\n`;
  desc += status.embeds.length > 0 ? '**Live Embeds:**\n' + status.embeds.map(e => `\u2022 \`${e.type}\` in <#${e.channel}> \u2014 ${e.running}`).join('\n') : '**Live Embeds:** None';
  desc += '\n\n';
  desc += status.scheduled.length > 0 ? '**Scheduled:**\n' + status.scheduled.map(s => `\u2022 <#${s.channel}> every ${s.interval} \u2014 ${s.running}`).join('\n') : '**Scheduled:** None';
  embed.setDescription(desc);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ─── Shutdown ────────────────────────────────────────────────────────────────

process.on('SIGINT', () => { stopAll(); client.destroy(); process.exit(0); });
process.on('SIGTERM', () => { stopAll(); client.destroy(); process.exit(0); });

// ─── Start ───────────────────────────────────────────────────────────────────

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('\u274C DISCORD_TOKEN not found! Create .env from .env.example');
  process.exit(1);
}
client.login(token);
