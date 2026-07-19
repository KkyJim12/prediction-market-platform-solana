import type { LiveFixture } from './useTxOdds'

export type MarketOutcome = {
  key: 'home' | 'draw' | 'away'
  label: string
  shortLabel: string
  probability: number | null
  price: number | null
}

type OddsSelection = {
  name: string
  probability: number | null
  price: number | null
}

type LiveMarket = {
  fixtureId: number
  market: string
  period: string | null
  inRunning: boolean
  bookmaker: string
  selections: OddsSelection[]
}

type OddsResponse = {
  configured: boolean
  source: 'txodds' | 'fallback'
  updatedAt?: string | null
  markets: LiveMarket[]
  error?: string
}

function normalizeProbability(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null
  return value <= 1 ? value * 100 : value
}

function namedSelection(selections: OddsSelection[], names: string[]) {
  const normalized = names.map(name => name.toLocaleLowerCase())
  return selections.find(selection => normalized.includes(selection.name.trim().toLocaleLowerCase()))
}

export function useMarketOdds(fixture: MaybeRefOrGetter<LiveFixture>) {
  const fixtureValue = computed(() => toValue(fixture))
  const endpoint = computed(() => `/api/txodds/odds/${fixtureValue.value.fixtureId}`)
  const { marketsByFixture, streamState, lastUpdate, connect } = useTxOddsStream()
  const { data, status, refresh } = useFetch<OddsResponse>(endpoint, {
    server: false,
    lazy: true,
    default: () => ({
      configured: false,
      source: 'fallback',
      markets: []
    })
  })

  onMounted(connect)

  const markets = computed<LiveMarket[]>(() => {
    const streamed = marketsByFixture.value[fixtureValue.value.fixtureId] ?? []
    if (!streamed.length) return data.value?.markets ?? []

    const streamedKeys = new Set(streamed.map(item =>
      `${item.market}|${item.period ?? ''}|${item.bookmaker}`
    ))
    return [
      ...streamed,
      ...(data.value?.markets ?? []).filter(item =>
        !streamedKeys.has(`${item.market}|${item.period ?? ''}|${item.bookmaker}`)
      )
    ]
  })

  const primaryMarket = computed(() => {
    const available = markets.value
    const threeWay = available.filter(market => market.selections.length >= 3)
    const fullMatch = threeWay.filter(market =>
      !market.period || /full|match|game|regular/i.test(market.period)
    )
    return fullMatch.find(market => /1x2|match odds|full.?time result|moneyline/i.test(market.market))
      ?? fullMatch[0]
      ?? threeWay.find(market => /1x2|match odds|full.?time result|moneyline/i.test(market.market))
      ?? threeWay[0]
      ?? available.find(market => market.selections.length >= 2)
  })

  const outcomes = computed<MarketOutcome[]>(() => {
    const market = primaryMarket.value
    const item = fixtureValue.value
    const homeName = item.participant1IsHome ? item.participant1 : item.participant2
    const awayName = item.participant1IsHome ? item.participant2 : item.participant1
    if (!market) {
      return [
        { key: 'home', label: homeName, shortLabel: 'HOME', probability: null, price: null },
        { key: 'draw', label: 'Draw', shortLabel: 'DRAW', probability: null, price: null },
        { key: 'away', label: awayName, shortLabel: 'AWAY', probability: null, price: null }
      ]
    }

    const hasDraw = market.selections.length >= 3
    const participant1 = namedSelection(market.selections, [item.participant1, '1', 'home'])
      ?? market.selections[0]
    const draw = namedSelection(market.selections, ['x', 'draw', 'tie'])
      ?? (hasDraw ? market.selections[1] : undefined)
    const participant2 = namedSelection(market.selections, [item.participant2, '2', 'away'])
      ?? market.selections[hasDraw ? 2 : 1]
    const home = item.participant1IsHome ? participant1 : participant2
    const away = item.participant1IsHome ? participant2 : participant1
    const picked = [home, draw, away]
    const rawProbabilities = picked.map(selection => normalizeProbability(selection?.probability ?? null))
    const derived = picked.map(selection => selection?.price && selection.price > 1 ? 100 / selection.price : null)
    const values = rawProbabilities.map((value, index) => value ?? derived[index])
    const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0)

    const probability = (index: number) => {
      const value = values[index]
      return value !== null && total > 0 ? value / total * 100 : null
    }

    return [
      { key: 'home', label: homeName, shortLabel: 'HOME', probability: probability(0), price: home?.price ?? null },
      { key: 'draw', label: 'Draw', shortLabel: 'DRAW', probability: probability(1), price: draw?.price ?? null },
      { key: 'away', label: awayName, shortLabel: 'AWAY', probability: probability(2), price: away?.price ?? null }
    ]
  })

  return {
    data,
    status,
    refresh,
    primaryMarket,
    outcomes,
    streamState,
    lastUpdate,
    oddsLive: computed(() => data.value?.source === 'txodds'),
    oddsError: computed(() => data.value?.error)
  }
}
