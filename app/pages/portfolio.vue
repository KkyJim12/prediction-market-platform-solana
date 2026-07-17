<script setup lang="ts">
const { getPool } = usePools()
const timeframe = ref<'1M' | '3M' | '1Y' | 'ALL'>('1Y')
const hideBalances = ref(false)

const positions = [
  { pool: getPool('argentina-win')!, staked: 2500, value: 2894, pnl: 394, pnlPercent: 15.76, matches: 18 },
  { pool: getPool('celtics-win')!, staked: 1500, value: 1719, pnl: 219, pnlPercent: 14.6, matches: 27 },
  { pool: getPool('lakers-win')!, staked: 800, value: 742, pnl: -58, pnlPercent: -7.25, matches: 14 }
]

const histories = {
  '1M': [5208, 5251, 5227, 5288, 5316, 5355],
  '3M': [5012, 5058, 5107, 5084, 5169, 5211, 5194, 5276, 5312, 5355],
  '1Y': [4800, 4842, 4817, 4906, 4968, 4931, 5052, 5119, 5086, 5198, 5264, 5239, 5318, 5355],
  'ALL': [4800, 4768, 4833, 4906, 4872, 4988, 5052, 5011, 5119, 5198, 5164, 5264, 5239, 5318, 5355]
}

const history = computed(() => histories[timeframe.value])
const chartPoints = computed(() => {
  const values = history.value
  const min = Math.min(...values) - 50
  const max = Math.max(...values) + 50
  return values.map((value, index) => {
    const x = index * (700 / (values.length - 1))
    const y = 230 - ((value - min) / (max - min)) * 190
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})
const chartArea = computed(() => `0,250 ${chartPoints.value} 700,250`)
const totalStaked = positions.reduce((sum, position) => sum + position.staked, 0)
const portfolioValue = positions.reduce((sum, position) => sum + position.value, 0)
const netPnl = positions.reduce((sum, position) => sum + position.pnl, 0)
const netPnlPercent = netPnl / totalStaked * 100
const totalMatches = positions.reduce((sum, position) => sum + position.matches, 0)

function money(value: number) {
  return hideBalances.value ? '••••••' : `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

useSeoMeta({
  title: 'Portfolio — Contraria',
  description: 'Monitor staked team pools, profit and loss, and portfolio performance.'
})
</script>

<template>
  <main class="portfolio-page">
    <section class="portfolio-header">
      <div>
        <span class="eyebrow"><span /> YOUR POSITIONS</span>
        <div class="portfolio-title-line"><h1>Portfolio.</h1><button type="button" :title="hideBalances ? 'Show balances' : 'Hide balances'" @click="hideBalances = !hideBalances"><Icon :name="hideBalances ? 'lucide:eye' : 'lucide:eye-off'" /></button></div>
        <p>Track capital deployed across team strategies and monitor realized and unrealized performance.</p>
      </div>
      <div class="portfolio-sync"><span class="network-dot" /><div><strong>Synced on-chain</strong><small>Solana Mainnet · just now</small></div></div>
    </section>

    <section class="portfolio-content">
      <div class="portfolio-metrics">
        <div class="primary-metric"><span>PORTFOLIO VALUE</span><strong class="mono">{{ money(portfolioValue) }}</strong><small :class="{ negative: netPnl < 0 }"><Icon :name="netPnl < 0 ? 'lucide:trending-down' : 'lucide:trending-up'" />{{ netPnl > 0 ? '+' : '' }}{{ netPnlPercent.toFixed(2) }}% all time</small></div>
        <div><span>TOTAL STAKED</span><strong class="mono">{{ money(totalStaked) }}</strong><small>Across {{ positions.length }} pools</small></div>
        <div><span>NET PROFIT / LOSS</span><strong :class="['mono', { negative: netPnl < 0 }]">{{ netPnl > 0 ? '+' : '' }}{{ money(netPnl) }}</strong><small>Realized +$184.00</small></div>
        <div><span>MATCHES SETTLED</span><strong class="mono">{{ totalMatches }}</strong><small>68.4% portfolio win rate</small></div>
      </div>

      <section class="portfolio-chart-panel">
        <div class="panel-heading">
          <div><span class="section-index mono">PORTFOLIO PERFORMANCE</span><h2>Profit & loss</h2></div>
          <div class="timeframe-tabs"><button v-for="range in (['1M', '3M', '1Y', 'ALL'] as const)" :key="range" :class="{ active: timeframe === range }" @click="timeframe = range">{{ range }}</button></div>
        </div>
        <div class="portfolio-chart-summary">
          <div><strong class="mono">{{ money(portfolioValue) }}</strong><span>Current value</span></div>
          <div><strong class="mono positive-text">+{{ money(netPnl) }}</strong><span>Net P&L</span></div>
        </div>
        <div class="portfolio-chart">
          <div class="chart-axis"><span>$5.4K</span><span>$5.1K</span><span>$4.8K</span></div>
          <svg viewBox="0 0 700 250" preserveAspectRatio="none" aria-label="Portfolio profit and loss graph">
            <defs><linearGradient id="portfolioArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#39c98a" stop-opacity=".25" /><stop offset="100%" stop-color="#39c98a" stop-opacity="0" /></linearGradient></defs>
            <polygon :points="chartArea" fill="url(#portfolioArea)" />
            <polyline :points="chartPoints" fill="none" stroke="var(--green)" stroke-width="3" vector-effect="non-scaling-stroke" />
          </svg>
        </div>
        <div class="portfolio-chart-labels"><span>START</span><span>MIDPOINT</span><span>NOW</span></div>
      </section>

      <section class="positions-section">
        <div class="positions-heading"><div><span class="section-index mono">STAKED POOLS</span><h2>Open positions</h2></div><span>{{ positions.length }} active</span></div>
        <div class="positions-table">
          <div class="position-table-head"><span>POOL</span><span>STAKED</span><span>CURRENT VALUE</span><span>PROFIT / LOSS</span><span>ALLOCATION</span><span /></div>
          <div v-for="position in positions" :key="position.pool.id" class="position-row">
            <div class="position-pool"><span class="team-badge">{{ position.pool.icon }}</span><div><strong>{{ position.pool.shortName }}</strong><small>{{ position.pool.nextMatch }}</small></div></div>
            <span class="mono">{{ money(position.staked) }}</span>
            <span class="mono">{{ money(position.value) }}</span>
            <span :class="['position-pnl', { negative: position.pnl < 0 }]"><strong class="mono">{{ position.pnl > 0 ? '+' : '' }}{{ money(position.pnl) }}</strong><small>{{ position.pnl > 0 ? '+' : '' }}{{ position.pnlPercent }}%</small></span>
            <span class="allocation-pill mono">{{ position.pool.allocation }}% / match</span>
            <NuxtLink :to="`/pool/${position.pool.slug}`" title="View pool"><Icon name="lucide:arrow-up-right" /></NuxtLink>
          </div>
        </div>
      </section>

      <div class="portfolio-disclaimer"><Icon name="lucide:info" /><p>Portfolio values use the latest settled pool balances. Unsettled match allocations are reflected after oracle resolution.</p></div>
    </section>
  </main>
</template>
