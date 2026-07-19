<script setup lang="ts">
type RankingMetric = 'volume' | 'pnl' | 'baseVolume'

type Trader = {
  address: string
  volume: number
  pnl: number
  baseVolume: number
  trades: number
}

const activeMetric = ref<RankingMetric>('volume')
const { mode, isTestMode } = useAppMode()
const traders = ref<Trader[]>([])
const leaderboardLoading = ref(false)
const leaderboardError = ref('')

const metrics: { key: RankingMetric; label: string; icon: string }[] = [
  { key: 'volume', label: 'Volume', icon: 'lucide:chart-no-axes-combined' },
  { key: 'pnl', label: 'PnL', icon: 'lucide:badge-dollar-sign' },
  { key: 'baseVolume', label: 'Base volume', icon: 'lucide:blocks' }
]

async function loadLeaderboard() {
  leaderboardLoading.value = true
  leaderboardError.value = ''
  try {
    const response = await $fetch<{ traders: Trader[] }>(isTestMode.value ? '/api/test/leaderboard' : '/api/leaderboard', {
      query: { metric: activeMetric.value }
    })
    traders.value = response.traders
  } catch (error: any) {
    traders.value = []
    leaderboardError.value = error?.data?.statusMessage || error?.message || 'Could not load leaderboard.'
  } finally {
    leaderboardLoading.value = false
  }
}

watch([activeMetric, mode], loadLeaderboard)
onMounted(loadLeaderboard)

function formatUsdc(value: number, signed = false) {
  const prefix = signed && value > 0 ? '+' : ''
  return `${prefix}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`
}

useSeoMeta({
  title: 'Leaderboard — PurpleX',
  description: 'Rank PurpleX traders by volume, profit and loss, and base volume.'
})
</script>

<template>
  <main class="leaderboard-page">
    <section class="leaderboard-hero">
      <div>
        <span class="cup-kicker"><Icon name="lucide:trophy" /> {{ isTestMode ? 'TEST MODE RANKINGS' : 'WORLD CUP TRADER RANKINGS' }}</span>
        <h1>Make your call.<br>Climb the table.</h1>
        <p>{{ isTestMode ? 'These rankings use only test_users and test_positions. Main Mode activity never appears here.' : 'Rankings track trading activity across PurpleX match markets. Volume is stake multiplied by locked odds; base volume is the original stake.' }}</p>
      </div>
      <div class="leaderboard-season">
        <span>ACTIVE SEASON</span>
        <strong>WORLD CUP</strong>
        <small>{{ isTestMode ? 'POSTGRESQL · TEST MODE' : 'POSTGRESQL · SOLANA DEVNET' }}</small>
      </div>
    </section>

    <section class="leaderboard-content">
      <div class="leaderboard-summary">
        <div><span>TRACKED TRADERS</span><strong>{{ traders.length }}</strong></div>
        <div><span>TOTAL VOLUME</span><strong>{{ formatUsdc(traders.reduce((sum, trader) => sum + trader.volume, 0)) }}</strong><small>USDC</small></div>
        <div><span>TOTAL TRADES</span><strong>{{ traders.reduce((sum, trader) => sum + trader.trades, 0).toLocaleString() }}</strong></div>
      </div>

      <div class="leaderboard-toolbar">
        <div>
          <span class="earn-section-label">RANK BY</span>
          <div class="leaderboard-tabs">
            <button
              v-for="metric in metrics"
              :key="metric.key"
              type="button"
              :class="{ active: activeMetric === metric.key }"
              @click="activeMetric = metric.key"
            >
              <Icon :name="metric.icon" /> {{ metric.label }}
            </button>
          </div>
        </div>
        <p v-if="activeMetric === 'baseVolume'"><Icon name="lucide:info" /> Base volume is the total input stake before odds, whether the position wins or loses.</p>
      </div>

      <section class="leaderboard-table-wrap">
        <header class="leaderboard-table-head">
          <span>RANK</span>
          <span>TRADER</span>
          <span>VOLUME</span>
          <span>REALIZED PNL</span>
          <span>BASE VOLUME</span>
          <span>TRADES</span>
        </header>

        <article v-for="(trader, index) in traders" :key="trader.address" class="leaderboard-row">
          <div class="leaderboard-rank" :class="`rank-${index + 1}`">
            <Icon v-if="index < 3" name="lucide:medal" />
            <strong>{{ String(index + 1).padStart(2, '0') }}</strong>
          </div>
          <div class="leaderboard-trader">
            <span>{{ trader.address.slice(0, 2) }}</span>
            <div><strong>{{ trader.address.slice(0, 5) }}…{{ trader.address.slice(-5) }}</strong><small>Solana trader</small></div>
          </div>
          <div><small>VOLUME</small><strong>{{ formatUsdc(trader.volume) }} <i>USDC</i></strong></div>
          <div><small>REALIZED PNL</small><strong :class="trader.pnl >= 0 ? 'positive' : 'negative'">{{ formatUsdc(trader.pnl, true) }} <i>USDC</i></strong></div>
          <div><small>BASE VOLUME</small><strong>{{ formatUsdc(trader.baseVolume) }} <i>USDC</i></strong></div>
          <div><small>TRADES</small><strong>{{ trader.trades }}</strong></div>
        </article>

        <div v-if="!traders.length" class="portfolio-empty-state">
          <Icon :name="leaderboardLoading ? 'lucide:loader-circle' : leaderboardError ? 'lucide:database-zap' : 'lucide:trophy'" />
          <h3>{{ leaderboardLoading ? 'Loading leaderboard…' : leaderboardError ? 'Leaderboard unavailable' : 'No ranked traders yet' }}</h3>
          <p>{{ leaderboardError || 'The first confirmed position will create the first leaderboard entry.' }}</p>
        </div>
      </section>

      <p class="leaderboard-disclaimer"><Icon name="lucide:database" /> {{ isTestMode ? 'Rankings use isolated test_* tables and contain no on-chain activity.' : 'Rankings use PostgreSQL aggregates derived from confirmed Solana position transactions.' }}</p>
    </section>
  </main>
</template>
