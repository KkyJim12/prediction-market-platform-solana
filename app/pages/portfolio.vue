<script setup lang="ts">
const { connected, walletAddress } = useSolanaWallet()
const { mode, isTestMode } = useAppMode()

type Position = {
  id: string
  fixtureId: string
  competition: string
  home: string
  away: string
  selection: string
  odds: number
  stake: number
  potentialPayout: number
  amountPaid: number | null
  openedAt: string
  status: 'open' | 'won' | 'lost' | 'voided'
}

type PortfolioResponse = {
  stats: {
    volume: number
    pnl: number
    baseVolume: number
    trades: number
    wins: number
    losses: number
    rank: number | null
  }
  positions: Position[]
}

const positions = ref<Position[]>([])
const stats = ref({
  volume: 0,
  pnl: 0,
  baseVolume: 0,
  trades: 0,
  wins: 0,
  losses: 0,
  rank: null as number | null
})
const loading = ref(false)
const portfolioError = ref('')

async function loadPortfolio() {
  positions.value = []
  stats.value = { volume: 0, pnl: 0, baseVolume: 0, trades: 0, wins: 0, losses: 0, rank: null }
  portfolioError.value = ''
  if (!walletAddress.value) return

  loading.value = true
  try {
    const response = await $fetch<PortfolioResponse>(
      `${isTestMode.value ? '/api/test/portfolio' : '/api/portfolio'}/${walletAddress.value}`
    )
    positions.value = response.positions
    stats.value = response.stats
  } catch (error: any) {
    portfolioError.value = error?.data?.statusMessage || error?.message || 'Could not load portfolio data.'
  } finally {
    loading.value = false
  }
}

watch([walletAddress, mode], loadPortfolio)
onMounted(loadPortfolio)
onActivated(loadPortfolio)

function openWallet() {
  if (!import.meta.client) return
  document.querySelector<HTMLButtonElement>('.cup-wallet')?.click()
}

function positionPnl(position: Position) {
  if (position.status === 'won') return (position.amountPaid ?? position.potentialPayout) - position.stake
  if (position.status === 'lost') return -position.stake
  return 0
}

function formatUsdc(value: number, signed = false) {
  const prefix = signed && value > 0 ? '+' : ''
  return `${prefix}${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`
}

useSeoMeta({
  title: 'Portfolio — PurpleX',
  description: 'Track your match-market positions, volume, profit and loss, and leaderboard performance.'
})
</script>

<template>
  <main class="portfolio-page">
    <section class="portfolio-stats-hero">
      <div>
        <span class="cup-kicker"><Icon name="lucide:chart-pie" /> {{ isTestMode ? 'TEST MODE DASHBOARD' : 'TRADER DASHBOARD' }}</span>
        <h1>Your portfolio.</h1>
        <p>{{ isTestMode ? 'Track database-only demo positions and settlements, completely separated from Main Mode statistics.' : 'Track positions, settlement activity, and the same performance metrics used by the PurpleX leaderboard.' }}</p>
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
          <small>{{ connected ? (loading ? 'Loading PostgreSQL stats' : 'Ranked by volume') : 'Connect wallet to view' }}</small>
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
              <h2>Positions</h2>
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

          <div v-if="positions.length" class="portfolio-position-list">
            <article v-for="position in positions" :key="position.id" class="portfolio-position-row">
              <div>
                <strong>{{ position.home }} vs {{ position.away }}</strong>
                <small>{{ position.competition }} · #{{ position.fixtureId }}</small>
              </div>
              <div><small>POSITION</small><strong>{{ position.selection }} · {{ position.status.toUpperCase() }}</strong></div>
              <div><small>AVG. ODDS</small><strong>{{ position.odds.toFixed(2) }}</strong></div>
              <div><small>STAKE</small><strong>{{ formatUsdc(position.stake) }}</strong></div>
              <div>
                <small>RETURN / PNL</small>
                <strong v-if="position.status === 'open'" class="portfolio-open-bet">+{{ formatUsdc(position.potentialPayout - position.stake) }} potential</strong>
                <strong v-else-if="position.status === 'voided'">Refunded</strong>
                <strong v-else :class="position.status === 'won' ? 'positive' : 'negative'">{{ formatUsdc(positionPnl(position), true) }}</strong>
              </div>
            </article>
          </div>

          <div v-else class="portfolio-empty-state">
            <div class="empty-portfolio-art"><span>1</span><span>X</span><span>2</span></div>
            <Icon name="lucide:chart-candlestick" />
            <h3>{{ connected ? (loading ? 'Loading positions…' : portfolioError ? 'Portfolio unavailable' : 'No market positions yet') : 'Connect to see your positions' }}</h3>
            <p>{{ connected ? (portfolioError || 'Confirmed on-chain bets will appear here with their current settlement status.') : 'Connect your Solana wallet to load open shares, settlements, and trading performance.' }}</p>
            <NuxtLink class="cup-primary" to="/matches">Browse markets <Icon name="lucide:arrow-right" /></NuxtLink>
          </div>
        </section>

        <aside class="portfolio-performance">
          <span>PERFORMANCE BREAKDOWN</span>
          <h2>Trading stats</h2>

          <div class="portfolio-performance-row">
            <span>Win rate</span>
            <strong>{{ connected && stats.wins + stats.losses ? `${((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)}%` : '—' }}</strong>
          </div>
          <div class="portfolio-performance-row">
            <span>Winning trades</span>
            <strong>{{ connected ? stats.wins : '—' }}</strong>
          </div>
          <div class="portfolio-performance-row">
            <span>Losing trades</span>
            <strong>{{ connected ? stats.losses : '—' }}</strong>
          </div>
          <div class="portfolio-performance-row">
            <span>Average trade</span>
            <strong>{{ connected ? `${formatUsdc(stats.trades ? stats.volume / stats.trades : 0)} USDC` : '—' }}</strong>
          </div>

          <div class="portfolio-indexer-note">
            <Icon name="lucide:database-zap" />
            <div>
              <strong>PostgreSQL position index</strong>
              <p>Stats are aggregated from confirmed Solana positions stored by the server.</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </main>
</template>
