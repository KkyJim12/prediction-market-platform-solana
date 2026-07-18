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

const metrics: { key: RankingMetric; label: string; icon: string }[] = [
  { key: 'volume', label: 'Volume', icon: 'lucide:chart-no-axes-combined' },
  { key: 'pnl', label: 'PnL', icon: 'lucide:badge-dollar-sign' },
  { key: 'baseVolume', label: 'Base volume', icon: 'lucide:blocks' }
]

const traders: Trader[] = [
  { address: '9vQ8...K7mP', volume: 842350, pnl: 98420, baseVolume: 514800, trades: 184 },
  { address: 'F4nT...2xLs', volume: 728940, pnl: 74610, baseVolume: 462500, trades: 151 },
  { address: '7cWp...m3Qa', volume: 681220, pnl: -12480, baseVolume: 601200, trades: 209 },
  { address: 'Bz6E...8rVn', volume: 574890, pnl: 53270, baseVolume: 389100, trades: 126 },
  { address: '3pKj...W9dR', volume: 486300, pnl: 41890, baseVolume: 284400, trades: 118 },
  { address: 'Ht2M...q6Yu', volume: 412760, pnl: -8410, baseVolume: 328900, trades: 97 },
  { address: 'Dx8A...4eZk', volume: 358420, pnl: 29150, baseVolume: 205600, trades: 83 },
  { address: '5sRn...L1cV', volume: 294880, pnl: 17620, baseVolume: 194300, trades: 76 }
]

const rankedTraders = computed(() =>
  [...traders].sort((a, b) => b[activeMetric.value] - a[activeMetric.value])
)

const metricLabel = computed(() =>
  metrics.find(metric => metric.key === activeMetric.value)?.label || 'Volume'
)

function formatUsdc(value: number, signed = false) {
  const prefix = signed && value > 0 ? '+' : ''
  return `${prefix}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`
}

useSeoMeta({
  title: 'Leaderboard — CupMarket',
  description: 'Rank CupMarket traders by volume, profit and loss, and base volume.'
})
</script>

<template>
  <main class="leaderboard-page">
    <section class="leaderboard-hero">
      <div>
        <span class="cup-kicker"><Icon name="lucide:trophy" /> WORLD CUP TRADER RANKINGS</span>
        <h1>Make your call.<br>Climb the table.</h1>
        <p>Rankings track trading activity across CupMarket match markets. Switch metrics to compare total volume, realized PnL, and eligible base volume.</p>
      </div>
      <div class="leaderboard-season">
        <span>ACTIVE SEASON</span>
        <strong>WORLD CUP</strong>
        <small>DEMO DATA · PRE-LAUNCH</small>
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
        <p v-if="activeMetric === 'baseVolume'"><Icon name="lucide:info" /> Base volume is eligible stake before market multipliers or promotional boosts.</p>
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

        <article v-for="(trader, index) in rankedTraders" :key="trader.address" class="leaderboard-row">
          <div class="leaderboard-rank" :class="`rank-${index + 1}`">
            <Icon v-if="index < 3" name="lucide:medal" />
            <strong>{{ String(index + 1).padStart(2, '0') }}</strong>
          </div>
          <div class="leaderboard-trader">
            <span>{{ trader.address.slice(0, 2) }}</span>
            <div><strong>{{ trader.address }}</strong><small>Solana trader</small></div>
          </div>
          <div><small>VOLUME</small><strong>{{ formatUsdc(trader.volume) }} <i>USDC</i></strong></div>
          <div><small>REALIZED PNL</small><strong :class="trader.pnl >= 0 ? 'positive' : 'negative'">{{ formatUsdc(trader.pnl, true) }} <i>USDC</i></strong></div>
          <div><small>BASE VOLUME</small><strong>{{ formatUsdc(trader.baseVolume) }} <i>USDC</i></strong></div>
          <div><small>TRADES</small><strong>{{ trader.trades }}</strong></div>
        </article>
      </section>

      <p class="leaderboard-disclaimer"><Icon name="lucide:database" /> Rankings currently use demonstration data. On-chain indexing will replace these records after the AMM program is deployed.</p>
    </section>
  </main>
</template>
