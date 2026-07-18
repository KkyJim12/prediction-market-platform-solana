<script setup lang="ts">
const { connected, walletAddress } = useSolanaWallet()

type DemoBet = {
  id: string
  fixtureId: number
  competition: string
  home: string
  away: string
  selection: string
  odds: number
  stake: number
  potentialPayout: number
  potentialProfit: number
  placedAt: string
  status: 'open' | 'won' | 'lost'
}

const bets = ref<DemoBet[]>([])

const stats = computed(() => ({
  volume: bets.value.reduce((sum, bet) => sum + bet.stake, 0),
  pnl: bets.value.reduce((sum, bet) =>
    sum + (bet.status === 'won' ? bet.potentialProfit : bet.status === 'lost' ? -bet.stake : 0), 0),
  baseVolume: bets.value.reduce((sum, bet) => sum + bet.stake, 0),
  trades: bets.value.length,
  rank: null as number | null
}))

function loadBets() {
  bets.value = []
  if (!import.meta.client || !walletAddress.value) return
  try {
    const saved = JSON.parse(localStorage.getItem(`cupmarket-demo-bets:${walletAddress.value}`) || '[]')
    bets.value = Array.isArray(saved) ? saved : []
  } catch {
    bets.value = []
  }
}

watch(walletAddress, loadBets)
onMounted(loadBets)
onActivated(loadBets)

function openWallet() {
  if (!import.meta.client) return
  document.querySelector<HTMLButtonElement>('.cup-wallet')?.click()
}

function formatUsdc(value: number, signed = false) {
  const prefix = signed && value > 0 ? '+' : ''
  return `${prefix}${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`
}

useSeoMeta({
  title: 'Portfolio — CupMarket',
  description: 'Track your match-market positions, volume, profit and loss, and leaderboard performance.'
})
</script>

<template>
  <main class="portfolio-page">
    <section class="portfolio-stats-hero">
      <div>
        <span class="cup-kicker"><Icon name="lucide:chart-pie" /> TRADER DASHBOARD</span>
        <h1>Your portfolio.</h1>
        <p>Track positions, settlement activity, and the same performance metrics used by the CupMarket leaderboard.</p>
      </div>

      <button v-if="!connected" class="cup-primary" type="button" @click="openWallet">
        <Icon name="lucide:wallet-cards" /> Connect wallet
      </button>
      <div v-else class="portfolio-wallet-chip">
        <span><i /> CONNECTED</span>
        <strong>{{ walletAddress.slice(0, 6) }}…{{ walletAddress.slice(-6) }}</strong>
      </div>
    </section>

    <section class="portfolio-stats-content">
      <div class="portfolio-ranking-strip">
        <div class="portfolio-rank-block">
          <span>YOUR WORLD CUP RANK</span>
          <strong>{{ stats.rank ? `#${stats.rank}` : '—' }}</strong>
          <small>{{ connected ? 'No indexed trades yet' : 'Connect wallet to view' }}</small>
        </div>

        <div class="portfolio-stat-block">
          <span>VOLUME</span>
          <Icon name="lucide:chart-no-axes-combined" />
          <strong>{{ connected ? formatUsdc(stats.volume) : '—' }}</strong>
          <small>USDC traded</small>
        </div>

        <div class="portfolio-stat-block">
          <span>REALIZED PNL</span>
          <Icon name="lucide:badge-dollar-sign" />
          <strong :class="{ positive: stats.pnl > 0, negative: stats.pnl < 0 }">{{ connected ? formatUsdc(stats.pnl, true) : '—' }}</strong>
          <small>USDC settled</small>
        </div>

        <div class="portfolio-stat-block">
          <span>BASE VOLUME</span>
          <Icon name="lucide:blocks" />
          <strong>{{ connected ? formatUsdc(stats.baseVolume) : '—' }}</strong>
          <small>Eligible stake</small>
        </div>

        <div class="portfolio-stat-block">
          <span>TRADES</span>
          <Icon name="lucide:repeat-2" />
          <strong>{{ connected ? stats.trades : '—' }}</strong>
          <small>Total executions</small>
        </div>
      </div>

      <div class="portfolio-body-grid">
        <section class="portfolio-positions">
          <div class="portfolio-section-head">
            <div>
              <span>MARKET ACTIVITY</span>
              <h2>Open positions</h2>
            </div>
            <NuxtLink to="/leaderboard">View leaderboard <Icon name="lucide:arrow-up-right" /></NuxtLink>
          </div>

          <div class="portfolio-position-columns">
            <span>MARKET</span>
            <span>POSITION</span>
            <span>AVG. PRICE</span>
            <span>VALUE</span>
            <span>PNL</span>
          </div>

          <div v-if="bets.length" class="portfolio-position-list">
            <article v-for="bet in bets" :key="bet.id" class="portfolio-position-row">
              <div>
                <strong>{{ bet.home }} vs {{ bet.away }}</strong>
                <small>{{ bet.competition }} · #{{ bet.fixtureId }}</small>
              </div>
              <div><small>POSITION</small><strong>{{ bet.selection }} @ {{ bet.odds.toFixed(2) }}</strong></div>
              <div><small>AVG. ODDS</small><strong>{{ bet.odds.toFixed(2) }}</strong></div>
              <div><small>STAKE</small><strong>{{ formatUsdc(bet.stake) }}</strong></div>
              <div>
                <small>RETURN / PNL</small>
                <strong v-if="bet.status === 'open'" class="portfolio-open-bet">+{{ formatUsdc(bet.potentialProfit) }} potential</strong>
                <strong v-else :class="bet.status === 'won' ? 'positive' : 'negative'">{{ bet.status === 'won' ? '+' : '-' }}{{ formatUsdc(bet.status === 'won' ? bet.potentialProfit : bet.stake) }}</strong>
              </div>
            </article>
          </div>

          <div v-else class="portfolio-empty-state">
            <div class="empty-portfolio-art"><span>1</span><span>X</span><span>2</span></div>
            <Icon name="lucide:chart-candlestick" />
            <h3>{{ connected ? 'No market positions yet' : 'Connect to see your positions' }}</h3>
            <p>{{ connected ? 'Your first prediction-market position will appear here after the AMM program and position indexer are live.' : 'Connect your Solana wallet to load open shares, settlements, and trading performance.' }}</p>
            <NuxtLink class="cup-primary" to="/matches">Browse markets <Icon name="lucide:arrow-right" /></NuxtLink>
          </div>
        </section>

        <aside class="portfolio-performance">
          <span>PERFORMANCE BREAKDOWN</span>
          <h2>Trading stats</h2>

          <div class="portfolio-performance-row">
            <span>Win rate</span>
            <strong>—</strong>
          </div>
          <div class="portfolio-performance-row">
            <span>Winning trades</span>
            <strong>{{ connected ? bets.filter(bet => bet.status === 'won').length : '—' }}</strong>
          </div>
          <div class="portfolio-performance-row">
            <span>Losing trades</span>
            <strong>{{ connected ? bets.filter(bet => bet.status === 'lost').length : '—' }}</strong>
          </div>
          <div class="portfolio-performance-row">
            <span>Average trade</span>
            <strong>{{ connected ? `${formatUsdc(stats.trades ? stats.volume / stats.trades : 0)} USDC` : '—' }}</strong>
          </div>

          <div class="portfolio-indexer-note">
            <Icon name="lucide:database-zap" />
            <div>
              <strong>Indexer pending</strong>
              <p>On-chain statistics will populate after the CupMarket AMM program is deployed.</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </main>
</template>
