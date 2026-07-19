<script setup lang="ts">
const {
  fixtures,
  updatedAt,
  txOddsConfigured,
  txOddsLive,
  txOddsErrorCode,
  txOddsError,
  status,
  refresh
} = useTxOdds()
const { isTestMode, mode } = useAppMode()
const { markets: testMarkets, loadingMarkets, marketsError, loadMarkets } = useTestPredictionMarket()

const search = ref('')
const stage = ref<'all' | 'live' | 'upcoming'>('all')
const competition = ref<number | 'all'>('all')
const competitionOpen = ref(false)
const competitionDropdown = ref<HTMLElement>()

const competitions = computed(() => {
  const values = new Map<number, string>()
  for (const fixture of fixtures.value) values.set(fixture.competitionId, fixture.competition)
  return [...values]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const selectedCompetitionLabel = computed(() =>
  competition.value === 'all'
    ? 'All competitions'
    : competitions.value.find(item => item.id === competition.value)?.name || 'All competitions'
)

function selectCompetition(value: number | 'all') {
  competition.value = value
  competitionOpen.value = false
}

function closeCompetitionDropdown(event: MouseEvent) {
  if (!competitionDropdown.value?.contains(event.target as Node)) {
    competitionOpen.value = false
  }
}

function closeCompetitionOnEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') competitionOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', closeCompetitionDropdown)
  document.addEventListener('keydown', closeCompetitionOnEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeCompetitionDropdown)
  document.removeEventListener('keydown', closeCompetitionOnEscape)
})

const visibleFixtures = computed(() => {
  const term = search.value.trim().toLocaleLowerCase()
  const now = Date.now()
  return fixtures.value.filter(fixture => {
    const matchesSearch = !term ||
      fixture.participant1.toLocaleLowerCase().includes(term) ||
      fixture.participant2.toLocaleLowerCase().includes(term) ||
      fixture.competition.toLocaleLowerCase().includes(term)
    const matchesCompetition = competition.value === 'all' ||
      fixture.competitionId === competition.value
    const isLive = fixture.startTime <= now &&
      fixture.startTime >= now - 6 * 60 * 60 * 1000
    const matchesStage = stage.value === 'all' ||
      (stage.value === 'live' ? isLive : fixture.startTime > now)
    return matchesSearch && matchesCompetition && matchesStage
  })
})

const visibleTestMarkets = computed(() => {
  const term = search.value.trim().toLocaleLowerCase()
  return testMarkets.value.filter(market => !term ||
    market.home.toLocaleLowerCase().includes(term) ||
    market.away.toLocaleLowerCase().includes(term) ||
    market.competition.toLocaleLowerCase().includes(term)
  )
})

watch(mode, () => {
  if (isTestMode.value) loadMarkets()
})
onMounted(() => {
  if (isTestMode.value) loadMarkets()
})

useSeoMeta({
  description: 'Browse World Cup and International Friendlies markets from the TxODDS TxLINE free tier.'
})
</script>

<template>
  <main class="markets-page">
    <template v-if="isTestMode">
      <section class="markets-hero">
        <div>
          <span class="cup-kicker"><span class="live-pulse" /> DATABASE TEST MODE</span>
          <h1>Demo markets.</h1>
          <p>Test the complete betting and settlement flow in PostgreSQL. No action on this page signs or sends a Solana transaction.</p>
        </div>
        <div class="market-feed-stats">
          <div><span>TEST MARKETS</span><strong>{{ testMarkets.length }}</strong></div>
          <div><span>EXECUTION</span><strong>DATABASE</strong></div>
          <div><span>ON-CHAIN TX</span><strong>NONE</strong></div>
        </div>
      </section>
      <section class="markets-content">
        <div class="market-toolbar">
          <label class="cup-search"><Icon name="lucide:search" /><input v-model="search" type="search" placeholder="Search a test market" aria-label="Search test markets"></label>
          <NuxtLink class="market-refresh" to="/management"><Icon name="lucide:sliders-horizontal" /> Manage markets</NuxtLink>
          <button class="market-refresh" type="button" :disabled="loadingMarkets" @click="loadMarkets()"><Icon name="lucide:refresh-cw" /> Refresh</button>
        </div>
        <div class="market-feed-line">
          <span><i class="live" /> PostgreSQL simulation active</span>
          <span>{{ visibleTestMarkets.length }} results</span>
        </div>
        <div v-if="visibleTestMarkets.length" class="amm-market-grid market-directory">
          <TestMarketCard v-for="market in visibleTestMarkets" :key="market.id" :market="market" @placed="loadMarkets" />
        </div>
        <section v-else class="cup-feed-empty">
          <Icon :name="loadingMarkets ? 'lucide:loader-circle' : 'lucide:database'" />
          <h3>{{ loadingMarkets ? 'Loading test markets…' : 'No test markets yet' }}</h3>
          <p>{{ marketsError || 'Create the first market, set its odds, and resolve it from the management page.' }}</p>
          <NuxtLink to="/management">Create a test market</NuxtLink>
        </section>
      </section>
    </template>
    <template v-else>
    <section class="markets-hero">
      <div>
        <span class="cup-kicker"><span class="live-pulse" /> TXLINE WORLD CUP FREE TIER</span>
        <h1>Match markets.</h1>
        <p>Back either team or the draw at TxLINE StablePrice decimal odds. Your return is the accepted stake multiplied by the accepted odds.</p>
      </div>
      <div class="market-feed-stats">
        <div><span>OPEN MARKETS</span><strong>{{ fixtures.length }}</strong></div>
        <div><span>PRICING</span><strong>FIXED ODDS</strong></div>
        <div><span>DATA FEED</span><strong :class="{ online: txOddsLive }">{{ txOddsLive ? 'ONLINE' : 'STANDBY' }}</strong></div>
      </div>
    </section>

    <section class="markets-content">
      <div class="market-toolbar">
        <label class="cup-search">
          <Icon name="lucide:search" />
          <input v-model="search" type="search" placeholder="Search a team" aria-label="Search a team">
        </label>
        <div ref="competitionDropdown" class="market-competition-dropdown">
          <button
            class="market-competition-trigger"
            type="button"
            aria-haspopup="listbox"
            :aria-expanded="competitionOpen"
            @click="competitionOpen = !competitionOpen"
          >
            <Icon name="lucide:trophy" />
            <span>{{ selectedCompetitionLabel }}</span>
            <Icon name="lucide:chevron-down" :class="{ open: competitionOpen }" />
          </button>
          <Transition name="dropdown-pop">
            <div v-if="competitionOpen" class="market-competition-menu" role="listbox" aria-label="Filter by competition">
              <button
                type="button"
                role="option"
                :aria-selected="competition === 'all'"
                :class="{ active: competition === 'all' }"
                @click="selectCompetition('all')"
              >
                <span><Icon name="lucide:layers-3" /> All competitions</span>
                <Icon v-if="competition === 'all'" name="lucide:check" />
              </button>
              <button
                v-for="item in competitions"
                :key="item.id"
                type="button"
                role="option"
                :aria-selected="competition === item.id"
                :class="{ active: competition === item.id }"
                @click="selectCompetition(item.id)"
              >
                <span><Icon name="lucide:trophy" /> {{ item.name }}</span>
                <Icon v-if="competition === item.id" name="lucide:check" />
              </button>
            </div>
          </Transition>
        </div>
        <div class="market-tabs">
          <button v-for="item in (['all', 'live', 'upcoming'] as const)" :key="item" type="button" :class="{ active: stage === item }" @click="stage = item">{{ item }}</button>
        </div>
        <button class="market-refresh" type="button" :disabled="status === 'pending'" @click="refresh()">
          <Icon :name="status === 'pending' ? 'lucide:loader-circle' : 'lucide:refresh-cw'" />
          Refresh feed
        </button>
      </div>

      <div class="market-feed-line">
        <span><i :class="{ live: txOddsLive }" /> {{ txOddsLive ? 'TxLINE connected' : 'TxLINE offline' }}</span>
        <span v-if="updatedAt">Last synced {{ new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
        <span>{{ visibleFixtures.length }} results</span>
      </div>

      <div v-if="visibleFixtures.length" class="amm-market-grid market-directory">
        <MatchMarketCard v-for="fixture in visibleFixtures" :key="fixture.fixtureId" :fixture="fixture" />
      </div>

      <section v-else-if="status === 'pending'" class="cup-feed-empty">
        <Icon name="lucide:loader-circle" />
        <h3>Opening the TxLINE feed</h3>
        <p>Fetching active and upcoming World Cup and International Friendlies fixtures.</p>
      </section>

      <section v-else-if="!txOddsConfigured" class="cup-feed-empty">
        <Icon name="lucide:key-round" />
        <h3>Connect the TxLINE API</h3>
        <p>Subscribe to the World Cup free tier and activate your API token from Settings.</p>
        <NuxtLink to="/settings">Open settings</NuxtLink>
      </section>

      <section v-else-if="txOddsError" class="cup-feed-empty">
        <Icon :name="txOddsErrorCode === 'TXODDS_TOKEN_INVALID' ? 'lucide:key-round' : 'lucide:cloud-off'" />
        <h3>{{ txOddsErrorCode === 'TXODDS_TOKEN_INVALID' ? 'TxLINE token needs activation' : 'Feed temporarily unavailable' }}</h3>
        <p>{{ txOddsError }}</p>
        <button type="button" @click="refresh()">Try again</button>
      </section>

      <section v-else class="cup-feed-empty">
        <Icon name="lucide:calendar-x-2" />
        <h3>No matching markets</h3>
        <p v-if="search || stage !== 'all' || competition !== 'all'">Try clearing the current filters.</p>
        <p v-else>The current free-tier snapshot has no active or upcoming covered fixtures.</p>
        <button v-if="search || stage !== 'all' || competition !== 'all'" type="button" @click="search = ''; stage = 'all'; competition = 'all'">Clear filters</button>
      </section>
    </section>
    </template>
  </main>
</template>
