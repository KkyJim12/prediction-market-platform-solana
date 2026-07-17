<script setup lang="ts">
const { pools } = usePools()
const activeFilter = ref('All pools')
const search = ref('')
const sort = ref<'volume' | 'return' | 'winrate'>('volume')
const sortOpen = ref(false)

const filters = ['All pools', 'Trending', 'Soccer', 'American Football', 'Basketball']

const filteredPools = computed(() => {
  const term = search.value.trim().toLowerCase()
  const result = pools.filter((pool) => {
    const filterMatch = activeFilter.value === 'All pools' ||
      (activeFilter.value === 'Trending' ? pool.hot : pool.sport === activeFilter.value)
    return filterMatch && (!term || pool.team.toLowerCase().includes(term) || pool.country.toLowerCase().includes(term))
  })

  return [...result].sort((a, b) => {
    if (sort.value === 'return') return b.backtest - a.backtest
    if (sort.value === 'winrate') return b.winRate - a.winRate
    return Number(b.liquidity.replace(/[$KM.]/g, '')) - Number(a.liquidity.replace(/[$KM.]/g, ''))
  })
})

const sortLabels = { volume: 'Highest liquidity', return: 'Best backtest', winrate: 'Highest win rate' }

function selectSort(value: 'volume' | 'return' | 'winrate') {
  sort.value = value
  sortOpen.value = false
}

useSeoMeta({ title: 'All team pools — Contraria', description: 'Filter and compare all verified team strategy pools.' })
</script>

<template>
  <main class="listing-page">
    <section class="page-hero">
      <div><span class="eyebrow"><span /> VERIFIED STRATEGIES</span><h1>Team pools.</h1><p>Compare every backoffice-managed pool by sport, historical return, allocation, and win rate.</p></div>
      <div class="page-hero-stat"><strong class="mono">{{ pools.length }}</strong><span>LIVE POOLS IN PREVIEW</span></div>
    </section>

    <section class="page-section pools-list-section">
      <div class="listing-toolbar">
        <div class="filter-row scrollbar-none">
          <button v-for="filter in filters" :key="filter" type="button" :class="['filter-chip', { active: activeFilter === filter }]" @click="activeFilter = filter">{{ filter }}</button>
        </div>
        <div class="toolbar-actions">
          <label class="search-box"><Icon name="lucide:search" /><input v-model="search" type="search" placeholder="Search teams" aria-label="Search teams"></label>
          <div class="sort-dropdown">
            <button type="button" :aria-expanded="sortOpen" @click="sortOpen = !sortOpen"><Icon name="lucide:arrow-up-down" />{{ sortLabels[sort] }}<Icon name="lucide:chevron-down" /></button>
            <Transition name="dropdown">
              <div v-if="sortOpen" class="sort-menu">
                <button v-for="value in (['volume', 'return', 'winrate'] as const)" :key="value" type="button" :class="{ selected: sort === value }" @click="selectSort(value)">{{ sortLabels[value] }}<Icon v-if="sort === value" name="lucide:check" /></button>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <div class="results-line"><span>{{ filteredPools.length }} pools</span><span><Icon name="lucide:shield-check" /> Published by Contraria backoffice</span></div>
      <div v-if="filteredPools.length" class="pool-grid">
        <PoolCard v-for="pool in filteredPools" :key="pool.id" :pool="pool" />
      </div>
      <div v-else class="empty-state"><Icon name="lucide:scan-search" /><h3>No pools found</h3><p>Try another sport or team.</p><button type="button" @click="search = ''; activeFilter = 'All pools'">Reset filters</button></div>
    </section>
  </main>
</template>
