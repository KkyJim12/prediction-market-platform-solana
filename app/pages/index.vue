<script setup lang="ts">
const { pools } = usePools()
const featuredPools = computed(() => pools.filter(pool => pool.hot).concat(pools.filter(pool => !pool.hot)).slice(0, 3))

useSeoMeta({
  title: 'Contraria — Team strategy pools on Solana',
  description: 'Explore backoffice-managed team win pools with transparent historical backtests.'
})
</script>

<template>
  <main>
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span /> TEAM STRATEGY POOLS ON SOLANA</div>
        <h1>Back your<br><em>team.</em></h1>
        <p>Join a pool dedicated to one team. A fixed share is deployed on every match win while the remaining balance stays ready for what comes next.</p>
        <div class="hero-actions">
          <NuxtLink class="primary-button" to="/pools">Explore all pools <Icon name="lucide:arrow-right" /></NuxtLink>
          <NuxtLink class="text-button" to="/pool/argentina-win">See Argentina backtest <Icon name="lucide:chart-no-axes-combined" /></NuxtLink>
        </div>
        <div class="managed-note"><Icon name="lucide:shield-check" /><span><strong>Backoffice curated</strong> Every pool and data source is reviewed before publishing.</span></div>
      </div>

      <aside class="signal-card">
        <div class="signal-topline"><span>LIVE SIGNAL</span><span class="live-indicator"><i /> 12,482 ONLINE</span></div>
        <div class="signal-number">$18.42M</div>
        <div class="signal-label">TOTAL STRATEGY VOLUME</div>
        <div class="signal-chart" aria-hidden="true">
          <svg viewBox="0 0 500 120" preserveAspectRatio="none">
            <defs><linearGradient id="homeChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff3b4f" stop-opacity=".25" /><stop offset="100%" stop-color="#ff3b4f" stop-opacity="0" /></linearGradient></defs>
            <path class="chart-area" d="M0 108 L35 102 L70 105 L105 86 L140 92 L175 70 L210 74 L245 44 L280 58 L315 50 L350 26 L385 37 L420 18 L455 25 L500 4 L500 120 L0 120Z" />
            <path class="chart-line" d="M0 108 L35 102 L70 105 L105 86 L140 92 L175 70 L210 74 L245 44 L280 58 L315 50 L350 26 L385 37 L420 18 L455 25 L500 4" />
          </svg>
        </div>
        <div class="signal-stats">
          <div><strong>128</strong><span>ACTIVE POOLS</span></div>
          <div><strong>6,104</strong><span>MEMBERS</span></div>
          <div><strong class="positive">68.2%</strong><span>AVG. WIN RATE</span></div>
        </div>
      </aside>
    </section>

    <section class="home-pools page-section">
      <div class="section-heading">
        <div><span class="section-index mono">01 / FEATURED POOLS</span><h2>Strategies worth watching.</h2></div>
        <NuxtLink class="outline-link" to="/pools">Browse all pools <Icon name="lucide:arrow-up-right" /></NuxtLink>
      </div>
      <div class="pool-grid">
        <PoolCard v-for="pool in featuredPools" :key="pool.id" :pool="pool" />
      </div>
    </section>

    <section class="mechanism-strip">
      <div class="mechanism-copy">
        <span class="section-index mono">02 / HOW IT WORKS</span>
        <h2>Simple rule.<br><em>Visible history.</em></h2>
        <p>Each pool follows one team and one repeatable strategy. Historical results are published before capital enters.</p>
        <NuxtLink class="light-button" to="/pool/argentina-win">Explore a full backtest <Icon name="lucide:arrow-up-right" /></NuxtLink>
      </div>
      <div class="mechanism-steps">
        <div><span class="mono">01</span><strong>Choose a verified pool</strong><p>Public pool creation is disabled. Strategies are published by the backoffice.</p></div>
        <div><span class="mono">02</span><strong>Allocate per match</strong><p>Argentina’s pool deploys 20% of available balance on each Argentina win.</p></div>
        <div><span class="mono">03</span><strong>Track every result</strong><p>Returns, drawdowns, win rate, and annual backtests remain visible.</p></div>
      </div>
    </section>
  </main>
</template>
