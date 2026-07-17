<script setup lang="ts">
const route = useRoute()
const { getPool } = usePools()
const pool = computed(() => getPool(String(route.params.slug)))
const deposit = ref('1000')
const timeframe = ref<'1Y' | '3Y' | 'ALL'>('ALL')
const depositReady = ref(false)

if (!pool.value) {
  throw createError({ statusCode: 404, statusMessage: 'Pool not found' })
}

const visibleHistory = computed(() => {
  const history = pool.value!.history
  if (timeframe.value === '1Y') return history.slice(-6)
  if (timeframe.value === '3Y') return history.slice(-12)
  return history
})

const chartPoints = computed(() => {
  const values = visibleHistory.value
  const min = Math.min(...values) - 4
  const max = Math.max(...values) + 4
  return values.map((value, index) => {
    const x = values.length === 1 ? 0 : index * (600 / (values.length - 1))
    const y = 220 - ((value - min) / (max - min)) * 190
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})

const chartArea = computed(() => `0,240 ${chartPoints.value} 600,240`)
const amount = computed(() => Number(deposit.value) || 0)
const nextAllocation = computed(() => (amount.value * pool.value!.allocation / 100).toFixed(2))
const reserve = computed(() => (amount.value * (100 - pool.value!.allocation) / 100).toFixed(2))
const estimatedYear = computed(() => (amount.value * (1 + pool.value!.annualized / 100)).toFixed(2))

useSeoMeta({
  title: () => `${pool.value?.shortName} — Contraria`,
  description: () => `View allocation, statistics, and multi-year backtest for the ${pool.value?.team} strategy pool.`
})
</script>

<template>
  <main v-if="pool" class="detail-page">
    <section class="pool-detail-header">
      <div class="detail-breadcrumb"><NuxtLink to="/pools">Pools</NuxtLink><Icon name="lucide:chevron-right" /><span>{{ pool.team }}</span></div>
      <div class="detail-title-row">
        <div class="detail-team">
          <span class="large-team-badge">{{ pool.icon }}</span>
          <div><span class="mono">{{ pool.sport.toUpperCase() }} · {{ pool.country.toUpperCase() }}</span><h1>{{ pool.shortName }}</h1><p><span class="live-dot" /> Next allocation: {{ pool.nextMatch }}</p></div>
        </div>
        <div class="verified-badge"><Icon name="lucide:shield-check" /><span><strong>Verified strategy</strong><small>Managed by Contraria backoffice</small></span></div>
      </div>
    </section>

    <section class="detail-layout">
      <div class="detail-main">
        <div class="metric-grid">
          <div><span>5Y BACKTEST</span><strong :class="{ negative: pool.backtest < 0 }">{{ pool.backtest > 0 ? '+' : '' }}{{ pool.backtest }}%</strong><small>Cumulative return</small></div>
          <div><span>ANNUALIZED</span><strong :class="{ negative: pool.annualized < 0 }">{{ pool.annualized > 0 ? '+' : '' }}{{ pool.annualized }}%</strong><small>Historical CAGR</small></div>
          <div><span>WIN RATE</span><strong>{{ pool.winRate }}%</strong><small>All settled matches</small></div>
          <div><span>PER MATCH</span><strong>{{ pool.allocation }}%</strong><small>{{ 100 - pool.allocation }}% remains reserve</small></div>
        </div>

        <section class="chart-panel">
          <div class="panel-heading"><div><span class="section-index mono">BACKTEST PERFORMANCE</span><h2>Growth of 100 USDC</h2></div><div class="timeframe-tabs"><button v-for="range in (['1Y', '3Y', 'ALL'] as const)" :key="range" :class="{ active: timeframe === range }" @click="timeframe = range">{{ range }}</button></div></div>
          <div class="chart-summary"><strong class="mono">{{ visibleHistory[visibleHistory.length - 1].toFixed(1) }} USDC</strong><span :class="{ negative: pool.backtest < 0 }">{{ pool.backtest > 0 ? '+' : '' }}{{ pool.backtest }}% all-time</span></div>
          <div class="backtest-chart">
            <div class="chart-grid"><span>180</span><span>140</span><span>100</span></div>
            <svg viewBox="0 0 600 240" preserveAspectRatio="none" aria-label="Historical backtest performance graph">
              <defs><linearGradient id="detailArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff3b4f" stop-opacity=".28" /><stop offset="100%" stop-color="#ff3b4f" stop-opacity="0" /></linearGradient></defs>
              <polygon :points="chartArea" fill="url(#detailArea)" />
              <polyline :points="chartPoints" fill="none" stroke="var(--accent)" stroke-width="3" vector-effect="non-scaling-stroke" />
            </svg>
          </div>
          <div class="chart-years"><span>2022</span><span>2023</span><span>2024</span><span>2025</span><span>2026</span></div>
          <p class="method-note"><Icon name="lucide:info" /> Backtest applies the current {{ pool.allocation }}% allocation rule to historical closing odds. Fees included; slippage excluded.</p>
        </section>

        <section class="yearly-panel">
          <div class="panel-heading"><div><span class="section-index mono">YEAR BY YEAR</span><h2>Backtest breakdown</h2></div></div>
          <div class="backtest-table">
            <div class="table-head"><span>YEAR</span><span>RETURN</span><span>WIN RATE</span><span>MATCHES</span><span>MAX DRAWDOWN</span></div>
            <div v-for="year in pool.yearly" :key="year.year" class="table-row">
              <strong class="mono">{{ year.year }}</strong><span :class="{ negative: year.return < 0 }">{{ year.return > 0 ? '+' : '' }}{{ year.return }}%</span><span>{{ year.winRate }}%</span><span>{{ year.matches }}</span><span class="negative">{{ year.drawdown }}%</span>
            </div>
          </div>
        </section>
      </div>

      <aside class="deposit-card">
        <span class="section-index mono">JOIN STRATEGY</span>
        <h2>Deposit into {{ pool.team }}</h2>
        <p>The pool only backs {{ pool.team }} to win. Withdrawals are available between unsettled matches.</p>
        <label class="amount-field"><span>DEPOSIT AMOUNT</span><div><input v-model="deposit" inputmode="decimal" aria-label="Deposit amount"><strong>USDC</strong></div></label>
        <div class="quick-amounts"><button v-for="value in ['100', '500', '1000', '5000']" :key="value" @click="deposit = value">${{ value }}</button></div>
        <div class="estimate-box">
          <div><span>Next-match allocation</span><strong>{{ nextAllocation }} USDC</strong></div>
          <div><span>Held in reserve</span><strong>{{ reserve }} USDC</strong></div>
          <div><span>Historical 1Y estimate</span><strong>{{ estimatedYear }} USDC</strong></div>
          <div><span>Creator fee</span><strong>{{ pool.fee }}</strong></div>
        </div>
        <button class="primary-button full" type="button" @click="depositReady = true">Review deposit <Icon name="lucide:arrow-right" /></button>
        <p class="risk-note"><Icon name="lucide:triangle-alert" /> Historical performance does not guarantee future results.</p>
        <Transition name="fade"><div v-if="depositReady" class="deposit-notice"><Icon name="lucide:check-circle" /><span><strong>Estimate prepared</strong><small>Connect your wallet to continue on-chain.</small></span><button @click="depositReady = false"><Icon name="lucide:x" /></button></div></Transition>
      </aside>
    </section>
  </main>
</template>
