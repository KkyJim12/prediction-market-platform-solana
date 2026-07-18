export type StreamMarket = {
  fixtureId: number
  market: string
  period: string | null
  inRunning: boolean
  bookmaker: string
  timestamp: number | null
  selections: {
    name: string
    probability: number | null
    price: number | null
  }[]
}

type StreamState = 'idle' | 'connecting' | 'live' | 'error'

let stream: EventSource | null = null

function decimalPrice(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value >= 1000) return value / 1000
  if (value >= 100) return value / 100
  return value
}

function probability(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value <= 1 ? value * 100 : value
  }
  if (typeof value !== 'string' || value === 'NA') return null
  const parsed = Number(value.replace('%', '').trim())
  if (!Number.isFinite(parsed)) return null
  return value.includes('%') ? parsed : parsed <= 1 ? parsed * 100 : parsed
}

function findPriceRecords(payload: unknown): Record<string, any>[] {
  if (Array.isArray(payload)) return payload.flatMap(findPriceRecords)
  if (!payload || typeof payload !== 'object') return []

  const record = payload as Record<string, any>
  if (Number(record.FixtureId ?? record.fixtureId) > 0) return [record]

  for (const key of ['data', 'odds', 'updates', 'prices', 'payload']) {
    if (record[key]) {
      const found = findPriceRecords(record[key])
      if (found.length) return found
    }
  }
  return []
}

function normalizeMarket(record: Record<string, any>): StreamMarket | null {
  const fixtureId = Number(record.FixtureId ?? record.fixtureId)
  const names = record.PriceNames ?? record.priceNames ?? record.selections?.map((item: any) => item.name)
  const prices = record.Prices ?? record.prices ?? record.selections?.map((item: any) => item.price)
  const percentages = record.Pct ?? record.pct ?? record.selections?.map((item: any) => item.probability)

  if (!Number.isSafeInteger(fixtureId) || !Array.isArray(names) || !Array.isArray(prices)) return null

  return {
    fixtureId,
    market: String(record.SuperOddsType ?? record.superOddsType ?? record.market ?? 'Match Result'),
    period: record.MarketPeriod ?? record.marketPeriod ?? record.period ?? null,
    inRunning: Boolean(record.InRunning ?? record.inRunning),
    bookmaker: String(record.Bookmaker ?? record.bookmaker ?? 'StablePrice'),
    timestamp: Number(record.Ts ?? record.ts) || null,
    selections: names.map((name: unknown, index: number) => ({
      name: String(name),
      probability: probability(percentages?.[index]),
      price: decimalPrice(prices[index])
    }))
  }
}

export function useTxOddsStream() {
  const marketsByFixture = useState<Record<number, StreamMarket[]>>('txodds-stream-markets', () => ({}))
  const streamState = useState<StreamState>('txodds-stream-state', () => 'idle')
  const lastUpdate = useState<string | null>('txodds-stream-updated-at', () => null)

  function acceptPayload(raw: string) {
    try {
      const records = findPriceRecords(JSON.parse(raw))
      for (const record of records) {
        const market = normalizeMarket(record)
        if (!market) continue

        const existing = marketsByFixture.value[market.fixtureId] ?? []
        const key = `${market.market}|${market.period ?? ''}|${market.bookmaker}`
        const next = existing.filter(item =>
          `${item.market}|${item.period ?? ''}|${item.bookmaker}` !== key
        )
        marketsByFixture.value = {
          ...marketsByFixture.value,
          [market.fixtureId]: [market, ...next]
        }
        lastUpdate.value = new Date().toISOString()
      }
    } catch {
      // Heartbeats and non-JSON control messages are intentionally ignored.
    }
  }

  function connect() {
    if (!import.meta.client || stream) return
    streamState.value = 'connecting'
    stream = new EventSource('/api/txodds/odds/stream')
    stream.onopen = () => {
      streamState.value = 'live'
    }
    stream.onmessage = event => acceptPayload(event.data)
    stream.addEventListener('stream-error', () => {
      streamState.value = 'error'
    })
    stream.onerror = () => {
      streamState.value = 'error'
    }
  }

  return {
    marketsByFixture,
    streamState,
    lastUpdate,
    connect
  }
}
