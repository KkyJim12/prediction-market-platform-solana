<script setup lang="ts">
const { fixtures, txOddsLive, updatedAt, status } = useTxOdds()

const featuredFixtures = computed(() => fixtures.value.slice(0, 6))

const nextFixture = computed(() => featuredFixtures.value[0])

useSeoMeta({
  title: 'CupMarket — World Cup prediction markets on Solana',
  description: 'Trade World Cup and International Friendlies outcomes with free-tier data from TxODDS TxLINE.'
})
</script>

<template>
  <main class="cup-home">
    <section class="cup-hero">
      <div class="cup-hero-grid">
        <div class="cup-hero-copy">
          <div class="cup-kicker"><span class="live-pulse" /> WORLD CUP FREE TIER · LIVE MARKETS</div>
          <h1>Every match.<br><em>Your call.</em></h1>
          <p>Trade the result, not the sportsbook. World Cup and International Friendlies fixtures flow from TxLINE’s free bundle into one market directory.</p>
          <div class="cup-hero-actions">
            <NuxtLink class="cup-primary" to="/matches">Explore markets <Icon name="lucide:arrow-up-right" /></NuxtLink>
            <span class="cup-data-proof"><Icon name="lucide:radio-tower" /> Odds by TxODDS TxLINE</span>
          </div>
        </div>

        <div class="cup-scoreboard">
          <div class="scoreboard-top">
            <span>NEXT MARKET</span>
            <span :class="{ live: txOddsLive }"><i />{{ txOddsLive ? 'DATA LIVE' : 'CONNECTING' }}</span>
          </div>
          <template v-if="nextFixture">
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
        <span><b>{{ fixtures.length }}</b> available markets</span>
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

      <div v-if="featuredFixtures.length" class="amm-market-grid">
        <MatchMarketCard v-for="fixture in featuredFixtures" :key="fixture.fixtureId" :fixture="fixture" />
      </div>
      <div v-else class="cup-feed-empty">
        <Icon name="lucide:radio-tower" />
        <h3>{{ status === 'pending' ? 'Syncing with TxLINE' : 'The World Cup feed is standing by' }}</h3>
        <p>Configure an activated free-tier API token to receive covered fixtures and reference odds.</p>
        <NuxtLink to="/matches">View feed status</NuxtLink>
      </div>
    </section>

    <section class="amm-explainer">
      <div>
        <span>02 / THE MARKET</span>
        <h2>Odds move with<br>every trade.</h2>
      </div>
      <div class="amm-steps">
        <article><b>01</b><Icon name="lucide:radio" /><h3>TxLINE seeds the market</h3><p>Fixtures and consensus reference probabilities arrive through the server-side data feed.</p></article>
        <article><b>02</b><Icon name="lucide:waves" /><h3>The AMM quotes instantly</h3><p>A liquidity curve returns shares, price impact, and the new market probability before you trade.</p></article>
        <article><b>03</b><Icon name="lucide:circle-dollar-sign" /><h3>Minimum bet is only $1</h3><p>Choose home, draw, or away and place a prediction from just 1 mock USDC.</p></article>
      </div>
    </section>
  </main>
</template>
