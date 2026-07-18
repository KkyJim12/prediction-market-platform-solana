<script setup lang="ts">
import type { TeamPool } from '~/composables/usePools'

const props = defineProps<{ pool: TeamPool }>()
const { findTeamFixture, formatFixture, txOddsLive } = useTxOdds()
const liveFixture = findTeamFixture(props.pool.team)
const matchLabel = computed(() => liveFixture.value ? formatFixture(liveFixture.value) : props.pool.nextMatch)
</script>

<template>
  <article class="pool-card">
    <div class="pool-card-top">
      <div class="pool-identity">
        <span class="team-badge">{{ pool.icon }}</span>
        <div><span class="mono">{{ pool.sport.toUpperCase() }}</span><small>{{ pool.country }}</small></div>
        <span v-if="pool.hot" class="hot-pill">HOT</span>
      </div>
      <Icon name="lucide:shield-check" class="verified-icon" title="Backoffice verified" />
    </div>

    <h3>{{ pool.shortName }}</h3>
    <p class="next-match"><Icon name="lucide:calendar-days" /> NEXT: {{ matchLabel }}</p>
    <div v-if="liveFixture && txOddsLive" class="txodds-source"><i /> TXLINE LIVE · FIXTURE {{ liveFixture.fixtureId }}</div>

    <div class="pool-card-stats">
      <div><span>5Y BACKTEST</span><strong :class="{ negative: pool.backtest < 0 }">{{ pool.backtest > 0 ? '+' : '' }}{{ pool.backtest }}%</strong></div>
      <div><span>PER MATCH</span><strong class="neutral">{{ pool.allocation }}%</strong></div>
    </div>

    <div class="allocation-track"><span :style="{ width: `${pool.allocation}%` }" /></div>

    <div class="result-strip">
      <span class="mono">LAST 10</span>
      <div><i v-for="(result, index) in pool.results" :key="index" :class="result">{{ result }}</i></div>
      <strong class="mono">{{ pool.record }}</strong>
    </div>

    <NuxtLink class="pool-card-link" :to="`/pool/${pool.slug}`">
      View pool & backtest
      <Icon name="lucide:arrow-up-right" />
    </NuxtLink>

    <div class="pool-card-meta">
      <span><Icon name="lucide:droplets" /> {{ pool.liquidity }}</span>
      <span><Icon name="lucide:users" /> {{ pool.members }}</span>
      <span class="fee"><Icon name="lucide:badge-percent" /> {{ pool.fee }}</span>
    </div>
  </article>
</template>
