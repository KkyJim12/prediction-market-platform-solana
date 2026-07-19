<script setup lang="ts">
const { fixtures, txOddsLive, updatedAt, status } = useTxOdds()
const { mode, isTestMode } = useAppMode()
const { markets: testMarkets, loadMarkets } = useTestPredictionMarket()

const featuredFixtures = computed(() => fixtures.value.slice(0, 6))
const featuredTestMarkets = computed(() => testMarkets.value.slice(0, 6))

const nextFixture = computed(() => featuredFixtures.value[0])
const nextTestMarket = computed(() => featuredTestMarkets.value[0])

watch(mode, () => {
  if (isTestMode.value) loadMarkets()
})
onMounted(() => {
  if (isTestMode.value) loadMarkets()
})
</script>

<template>
  <main class="cup-home">
    <section class="cup-hero">
      <div class="cup-hero-grid">
        <div class="cup-hero-copy">
          <div class="cup-kicker"><span class="live-pulse" /> {{ isTestMode ? 'HACKATHON DATABASE DEMO · NO ON-CHAIN TX' : 'WORLD CUP FREE TIER · LIVE MARKETS' }}</div>
          <h1>Every match.<br><em>Your call.</em></h1>
          <p>{{ isTestMode ? 'Try every flow with isolated PostgreSQL balances, markets, positions, liquidity, and settlement. Your wallet never signs or sends a transaction.' : 'Trade the result, not the sportsbook. World Cup and International Friendlies fixtures flow from TxLINE’s free bundle into one market directory.' }}</p>
          <div class="cup-hero-actions">
            <NuxtLink class="cup-primary" to="/matches">Explore markets <Icon name="lucide:arrow-up-right" /></NuxtLink>
            <span class="cup-data-proof"><Icon :name="isTestMode ? 'lucide:database' : 'lucide:radio-tower'" /> {{ isTestMode ? 'PostgreSQL simulation' : 'Odds by TxODDS TxLINE' }}</span>
          </div>
        </div>

        <div class="cup-scoreboard">
          <div class="scoreboard-top">
            <span>NEXT MARKET</span>
            <span :class="{ live: isTestMode || txOddsLive }"><i />{{ isTestMode ? 'TEST DB LIVE' : txOddsLive ? 'DATA LIVE' : 'CONNECTING' }}</span>
          </div>
          <template v-if="isTestMode && nextTestMarket">
            <div class="scoreboard-stage">{{ nextTestMarket.competition }}</div>
            <div class="scoreboard-match">
              <div><span>{{ nextTestMarket.home.slice(0, 2).toUpperCase() }}</span><strong>{{ nextTestMarket.home }}</strong></div>
              <div class="scoreboard-vs"><b>VS</b><time>{{ new Date(nextTestMarket.bettingClosesAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }) }}</time></div>
              <div><span>{{ nextTestMarket.away.slice(0, 2).toUpperCase() }}</span><strong>{{ nextTestMarket.away }}</strong></div>
            </div>
            <NuxtLink to="/matches">Open test market <Icon name="lucide:arrow-right" /></NuxtLink>
          </template>
          <template v-else-if="!isTestMode && nextFixture">
            <div class="scoreboard-stage">{{ nextFixture.competition }}</div>
            <div class="scoreboard-match">
              <div><span>{{ nextFixture.participant1.slice(0, 2).toUpperCase() }}</span><strong>{{ nextFixture.participant1 }}</strong></div>
              <div class="scoreboard-vs"><b>VS</b><time>{{ new Date(nextFixture.startTime).toLocaleDateString('en', { month: 'short', day: 'numeric' }) }}</time></div>
              <div><span>{{ nextFixture.participant2.slice(0, 2).toUpperCase() }}</span><strong>{{ nextFixture.participant2 }}</strong></div>
            </div>
            <NuxtLink to="/matches">Open live market <Icon name="lucide:arrow-right" /></NuxtLink>
          </template>
          <div v-else class="scoreboard-empty">
            <Icon :name="status === 'pending' ? 'lucide:loader-circle' : 'lucide:calendar-clock'" />
            <strong>{{ status === 'pending' ? 'Loading the fixture feed' : 'No upcoming fixture' }}</strong>
            <span>The feed refreshes automatically.</span>
          </div>
        </div>
      </div>
      <div class="cup-ticker">
        <span><b>{{ isTestMode ? testMarkets.length : fixtures.length }}</b> available markets</span>
        <span><b>1X2</b> match outcome</span>
        <span><b>USDC</b> settlement asset</span>
        <span><b>AMM</b> continuous liquidity</span>
        <span v-if="updatedAt"><b>FEED</b> {{ new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
      </div>
    </section>

    <section class="cup-market-section">
      <div class="cup-section-head">
        <div><span>01 / UPCOMING</span><h2>Markets in play.</h2></div>
        <NuxtLink to="/matches">View all <Icon name="lucide:arrow-right" /></NuxtLink>
      </div>

      <div v-if="isTestMode && featuredTestMarkets.length" class="amm-market-grid">
        <TestMarketCard v-for="market in featuredTestMarkets" :key="market.id" :market="market" @placed="loadMarkets" />
      </div>
      <div v-else-if="!isTestMode && featuredFixtures.length" class="amm-market-grid">
        <MatchMarketCard v-for="fixture in featuredFixtures" :key="fixture.fixtureId" :fixture="fixture" />
      </div>
      <div v-else class="cup-feed-empty">
        <Icon name="lucide:radio-tower" />
        <h3>{{ isTestMode ? 'No test markets yet' : status === 'pending' ? 'Syncing with TxLINE' : 'The World Cup feed is standing by' }}</h3>
        <p>{{ isTestMode ? 'Create your first demo market and choose its odds from Management.' : 'Configure an activated free-tier API token to receive covered fixtures and reference odds.' }}</p>
        <NuxtLink :to="isTestMode ? '/management' : '/matches'">{{ isTestMode ? 'Create test market' : 'View feed status' }}</NuxtLink>
      </div>
    </section>

    <section class="amm-explainer">
      <div>
        <span>02 / THE MARKET</span>
        <h2>Odds move with<br>every trade.</h2>
      </div>
      <div class="amm-steps">
        <article><b>01</b><Icon :name="isTestMode ? 'lucide:sliders-horizontal' : 'lucide:radio'" /><h3>{{ isTestMode ? 'Any user creates a market' : 'TxLINE seeds the market' }}</h3><p>{{ isTestMode ? 'Set the teams, closing time, and exact decimal odds from Management.' : 'Fixtures and consensus reference probabilities arrive through the server-side data feed.' }}</p></article>
        <article><b>02</b><Icon :name="isTestMode ? 'lucide:database' : 'lucide:waves'" /><h3>{{ isTestMode ? 'PostgreSQL executes the flow' : 'The AMM quotes instantly' }}</h3><p>{{ isTestMode ? 'Balances, pool liabilities, LP shares, and positions update atomically without Solana.' : 'A liquidity curve returns shares, price impact, and the new market probability before you trade.' }}</p></article>
        <article><b>03</b><Icon name="lucide:circle-dollar-sign" /><h3>Minimum bet is only $1</h3><p>Choose home, draw, or away and place a prediction from just 1 mock USDC.</p></article>
      </div>
    </section>
  </main>
</template>
