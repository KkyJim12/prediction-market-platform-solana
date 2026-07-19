# CupMarket

A World Cup AMM prediction-market interface on Solana, powered by Nuxt and
TxODDS TxLINE free-tier match and reference-odds data.

## Main and Test Mode

The menu-bar switch persists the selected mode in the browser:

- **Main** uses the deployed Solana devnet program and the `users` /
  `positions` PostgreSQL index.
- **Test** never builds, signs, or sends a Solana transaction. Faucet balances,
  bets, liquidity, LP shares, payouts, portfolio stats, and leaderboard stats
  are simulated transactionally in the isolated `test_*` PostgreSQL tables.

In Test Mode, `/management` lets any connected wallet address create a demo
market, set its three decimal odds, and resolve or void it. The public key is
used only as the demo account identifier; Test Mode never requests a wallet
signature.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## TxODDS TxLINE World Cup free tier

The server loads active and upcoming World Cup and International Friendlies
fixtures covered by TxLINE's standard free bundle. It filters the snapshot
server-side and only allows odds requests for covered fixtures.

Subscribe on-chain with `SELECTED_LEAGUES = []`, using mainnet service level
`1` for the 60-second delayed tier or mainnet service level `12` for real-time.
The free tier requires no TxL purchase, but the subscription transaction still
requires SOL for fees and possible account rent. Then copy the environment
file:

```bash
cp .env.example .env
```

Set `NUXT_TX_ODDS_API_TOKEN` to the token returned by
`POST /api/token/activate`. The server creates and renews the guest JWT
automatically, so `NUXT_TX_ODDS_GUEST_JWT` is optional.

This app also exposes same-origin activation routes. First request a fresh
guest JWT:

```bash
curl --request POST http://localhost:3000/api/txodds/auth/guest
```

After the subscription transaction is confirmed, sign the exact UTF-8 message
`<txSig>::<guestJwt>` with the same wallet. Base64-encode the detached 64-byte
signature, then activate the free bundle:

```bash
curl --request POST http://localhost:3000/api/txodds/auth/activate \
  --header "Content-Type: application/json" \
  --data '{
    "guestJwt": "<guest-jwt>",
    "txSig": "<subscription-transaction-signature>",
    "walletSignature": "<base64-wallet-signature>",
    "leagues": []
  }'
```

The response is `{ "apiToken": "..." }`. Store that value as
`NUXT_TX_ODDS_API_TOKEN` in a server-side environment or secret manager; never
ship the token or guest JWT in client code.

Use `https://txline.txodds.com` for a mainnet subscription or
`https://txline-dev.txodds.com` for devnet. The host, Solana network, and
activated token must match.

Browse covered match markets at `/matches`. The endpoint requests the current
UTC epoch window, filters non-free-tier, cancelled, or stale fixtures, and
caches successful responses for 60 seconds. Odds are fetched per fixture from
the server-only proxy and normalized into two-way or home/draw/away reference
probabilities.

When no API token is configured, `/settings` shows an activation panel. Connect
Phantom or Solflare, choose mainnet service level `1` (60-second delay) or `12`
(real-time), and select **Subscribe & activate**. The wallet submits the
four-week standard-bundle subscription, signs the activation message, and
loads the resulting token into the current Nuxt server process. Copy the token
to `NUXT_TX_ODDS_API_TOKEN` to keep it after a server restart.

Solana blockhash and confirmation reads go through the Nuxt server so browsers
do not call the rate-limited public RPC directly. For production, set
`NUXT_SOLANA_RPC_URL` to a private mainnet RPC endpoint; the URL and any API key
remain server-only.

When no API token is configured—or when TxODDS is temporarily unavailable—the
UI displays an explicit feed state and does not invent fixture or odds data.

The trade ticket is an AMM quote preview. It calculates shares, average price,
price impact, post-trade probability, and potential payout, but does not submit
an on-chain transaction until a market program is connected.

## Prediction-market contract

The faucet, match tickets, and liquidity page integrate with the single-pool
Anchor program `9zgAu5MyTuFsGSU7mCwqQSYNEubmaKaMGyuzuGWyj2qg`. Prediction
market reads use a separate server-side RPC so the TxLINE subscription network
can remain independently configured.

Development defaults to Solana devnet. Configure the deployed cluster and
program in `.env`:

```dotenv
NUXT_PREDICTION_MARKET_RPC_URL=https://api.devnet.solana.com
NUXT_PUBLIC_PREDICTION_MARKET_CLUSTER=devnet
NUXT_PUBLIC_PREDICTION_MARKET_PROGRAM_ID=9zgAu5MyTuFsGSU7mCwqQSYNEubmaKaMGyuzuGWyj2qg
```

The app hashes the decimal TxLINE fixture ID with SHA-256 to derive
`["market", match_id]`. The oracle worker must publish markets using that same
external ID representation. TxLINE prices remain reference data; executable
odds always come from the on-chain `Market` account.

Every faucet, bet, deposit, and withdrawal is simulated by the configured
prediction-market RPC before the browser wallet is asked to sign. The connected
wallet must be set to the same cluster shown in the transaction review.

## PostgreSQL portfolio index

Portfolio and leaderboard data use two PostgreSQL tables:

- `users` stores aggregate volume, realized PnL, base volume, trades, wins, and
  losses for each wallet.
- `positions` stores the on-chain bet PDA, market, stake, locked odds, payout,
  transaction signatures, and the `open`, `won`, `lost`, or `voided` state.

Create a PostgreSQL database and configure the server-only connection:

```dotenv
NUXT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/purplex
NUXT_DATABASE_SSL=false
```

The Nuxt server creates the schema lazily on the first database request. For a
controlled deployment, apply the checked-in migration first:

```bash
psql "$NUXT_DATABASE_URL" -f database/migrations/001_stats_and_positions.sql
psql "$NUXT_DATABASE_URL" -f database/migrations/002_test_mode.sql
psql "$NUXT_DATABASE_URL" -f database/migrations/003_volume_uses_odds_adjusted_payout.sql
```

After a bet confirms, the server decodes its Solana `place_bet` instruction
before inserting it. Financial fields are never accepted directly from the
browser. Portfolio and leaderboard reads also validate program-owned `Bet` and
`Market` accounts and synchronize finalized position states. A PostgreSQL
trigger recalculates `users` whenever a position changes.

Only bets placed after this integration are inserted automatically. Historical
transactions require a separate one-time event backfill.

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
