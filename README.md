# NQPulse - Real-Time NQ/QQQ Bias Engine

A Discord bot that tracks the top NQ/QQQ holdings in **real-time** and calculates market bias to help you determine directional lean for trading Nasdaq futures.

## Real-Time Features

- **`/live`** — Starts a live-updating embed that **auto-refreshes every 30 seconds**
- **`/autoupdate`** — Posts bias updates to a channel on a custom schedule (1-60 min)
- **Bot status ticker** — The bot's "Watching" status rotates live NQ price, QQQ, and bias
- **Refresh button** — Every `/bias` embed has a one-click refresh button
- **Stop button** — All live feeds have a stop button to kill the feed
- **Auto-stop** — Live feeds automatically stop after 4 hours to prevent runaway

## All Commands

| Command | Description |
|---------|-------------|
| `/bias` | One-shot bias analysis with refresh button |
| `/live` | **LIVE** auto-updating feed (refreshes every 30s) — choose bias or futures |
| `/autoupdate start` | Start scheduled bias posts in the channel (default: every 5 min) |
| `/autoupdate stop` | Stop scheduled posts in the current channel |
| `/stock <symbol>` | Individual stock quote |
| `/watchlist` | All 15 tracked holdings with ANSI-colored table |
| `/sectors` | Sector rotation analysis (Big Tech, Semis, Growth, Software) |
| `/futures` | One-shot NQ futures + QQQ data |
| `/status` | View all active live feeds and scheduled updates |

## How Real-Time Works

```
/live bias        -> Auto-edits the same embed every 30s (no spam)
/autoupdate       -> Posts new compact updates on a schedule
Bot Status        -> Rotates NQ/QQQ prices every 15s
```

## Tracked Stocks (by QQQ weight)

AAPL, MSFT, NVDA, AMZN, META, GOOGL, GOOG, AVGO, TSLA, COST, NFLX, AMD, ADBE, QCOM, TMUS

## Bias Levels

| Level | Condition | Meaning |
|-------|-----------|---------|
| STRONG BULLISH | Weighted score >= +1.0% | Heavy buying across top names |
| BULLISH | Score >= +0.3% | Majority of weight is green |
| NEUTRAL | Between -0.3% and +0.3% | Mixed/choppy, no clear direction |
| BEARISH | Score <= -0.3% | Majority of weight is red |
| STRONG BEARISH | Score <= -1.0% | Heavy selling across top names |

## Setup

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** -> name it (e.g., "NQPulse")
3. Go to **Bot** tab -> **Reset Token** -> copy the token
4. Go to **OAuth2** tab -> copy the **Client ID**
5. Under **OAuth2 -> URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
6. Use the generated URL to invite the bot to your server

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your token and client ID
```

### 3. Install & Run

```bash
npm install
npm run deploy-commands   # Register slash commands (once)
npm start                 # Start the bot with live tracking
```

## Tech Stack

- **Runtime:** Node.js 18+
- **Discord:** discord.js v14
- **Market Data:** Yahoo Finance (free, no API key needed)
- **Real-time:** setInterval-based message editing (Discord API compliant)
