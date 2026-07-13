import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName('bias')
    .setDescription('Get overall NQ/QQQ market bias (one-shot with refresh button)')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('live')
    .setDescription('Start a LIVE auto-updating feed that refreshes every 30 seconds')
    .addStringOption(option =>
      option.setName('type').setDescription('What to track live').setRequired(false)
        .addChoices(
          { name: 'Bias (full analysis)', value: 'bias' },
          { name: 'Futures (NQ + QQQ)', value: 'futures' },
        )
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('autoupdate')
    .setDescription('Auto-post bias updates to this channel on a schedule')
    .addStringOption(option =>
      option.setName('action').setDescription('Start or stop auto updates').setRequired(true)
        .addChoices(
          { name: 'Start posting updates', value: 'start' },
          { name: 'Stop updates in this channel', value: 'stop' },
        )
    )
    .addIntegerOption(option =>
      option.setName('interval').setDescription('Update interval in minutes (default: 5)')
        .setRequired(false).setMinValue(1).setMaxValue(60)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('stock')
    .setDescription('Get quote data for a specific stock')
    .addStringOption(option =>
      option.setName('symbol').setDescription('Stock ticker symbol (e.g., AAPL, NVDA, TSLA)').setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('watchlist')
    .setDescription('View all tracked NQ/QQQ top holdings with prices')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('sectors')
    .setDescription('View bias breakdown by sector (Big Tech, Semis, etc.)')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('futures')
    .setDescription('Get NQ futures and QQQ ETF data (one-shot)')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('View all active live feeds and scheduled updates')
    .toJSON(),
];

async function deployCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId) {
    console.error('\u274C Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
    process.exit(1);
  }

  const rest = new REST().setToken(token);

  try {
    console.log(`\uD83D\uDD04 Registering ${commands.length} slash commands...`);

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`\u2705 Commands registered for guild ${guildId} (instant)`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('\u2705 Global commands registered (up to 1 hour to propagate)');
    }
  } catch (error) {
    console.error('\u274C Error deploying commands:', error);
  }
}

deployCommands();
