import type { TxOddsFixture, TxOddsPrice } from '../../../utils/txodds'
import {
  txOddsConfigured,
  txOddsFreeTierCompetition,
  txOddsRequest
} from '../../../utils/txodds'

function decimalPrice(value?: number) {
  if (typeof value !== 'number') return null
  if (value >= 1000) return value / 1000
  if (value >= 100) return value / 100
  return value
}

function probability(value?: string) {
  if (!value || value === 'NA') return null
  const parsed = Number(value.replace('%', '').trim())
  if (!Number.isFinite(parsed)) return null
  return value.includes('%') ? parsed : parsed <= 1 ? parsed * 100 : parsed
}

export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const fixtureId = Number(getRouterParam(event, 'fixtureId'))

  if (!Number.isSafeInteger(fixtureId) || fixtureId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid fixture ID' })
  }

  if (!txOddsConfigured(config)) {
    return {
      configured: false,
      source: 'fallback' as const,
      scope: 'world-cup-free' as const,
      markets: []
    }
  }

  try {
    const startEpochDay = Math.floor((Date.now() - 6 * 60 * 60 * 1000) / 86_400_000)
    const fixtures = await txOddsRequest<TxOddsFixture[]>(
      config,
      '/api/fixtures/snapshot',
      { startEpochDay }
    )
    const fixture = fixtures.find(item => item.FixtureId === fixtureId)

    if (!fixture || !txOddsFreeTierCompetition(fixture.Competition)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Fixture is not covered by the TxLINE World Cup free tier'
      })
    }

    const odds = await txOddsRequest<TxOddsPrice[]>(
      config,
      `/api/odds/snapshot/${fixtureId}`
    )

    return {
      configured: true,
      source: 'txodds' as const,
      scope: 'world-cup-free' as const,
      updatedAt: new Date().toISOString(),
      markets: odds.map(market => ({
        fixtureId: market.FixtureId,
        timestamp: market.Ts,
        market: market.SuperOddsType,
        period: market.MarketPeriod ?? null,
        inRunning: market.InRunning,
        bookmaker: market.Bookmaker,
        selections: (market.PriceNames ?? []).map((name, index) => ({
          name,
          probability: probability(market.Pct?.[index]),
          price: decimalPrice(market.Prices?.[index])
        }))
      }))
    }
  } catch (error: any) {
    if (error?.statusCode === 404) throw error

    console.error(`TxODDS odds request failed for fixture ${fixtureId}`, error?.statusMessage ?? error?.message)
    return {
      configured: true,
      source: 'fallback' as const,
      scope: 'world-cup-free' as const,
      updatedAt: null,
      markets: [],
      error: 'Live StablePrice odds are temporarily unavailable.'
    }
  }
}, {
  maxAge: 30,
  name: 'txodds-odds'
})
