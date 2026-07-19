import { randomUUID } from 'node:crypto'
import { useDatabase } from '../../../utils/db'
import { requireOdds, requireTestWallet, text } from '../../../utils/testMode'
import { serializeTestMarket, type TestMarketRow } from '../../../utils/testMarketData'

type Body = {
  wallet?: unknown
  fixtureId?: unknown
  competition?: unknown
  home?: unknown
  away?: unknown
  homeOdds?: unknown
  drawOdds?: unknown
  awayOdds?: unknown
  bettingClosesAt?: unknown
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  const wallet = requireTestWallet(body.wallet)
  const fixtureId = text(body.fixtureId, 64)
  const competition = text(body.competition, 160, 'Hackathon Demo')
  const home = text(body.home, 160)
  const away = text(body.away, 160)
  const closesAt = new Date(typeof body.bettingClosesAt === 'string' ? body.bettingClosesAt : '')
  if (!fixtureId || !home || !away || home.toLowerCase() === away.toLowerCase()) {
    throw createError({ statusCode: 400, statusMessage: 'Fixture ID and two different teams are required.' })
  }
  if (!Number.isFinite(closesAt.getTime()) || closesAt.getTime() <= Date.now()) {
    throw createError({ statusCode: 400, statusMessage: 'Betting close time must be in the future.' })
  }

  const database = useDatabase(event)
  try {
    const market = await database.transaction(async (client) => {
      await client.query(
        `INSERT INTO test_users (wallet_address) VALUES ($1)
         ON CONFLICT (wallet_address) DO NOTHING`,
        [wallet]
      )
      const result = await client.query<TestMarketRow>(
        `INSERT INTO test_markets (
          id, fixture_id, competition, home_team, away_team,
          home_odds, draw_odds, away_odds, betting_closes_at, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [
          randomUUID(),
          fixtureId,
          competition,
          home,
          away,
          requireOdds(body.homeOdds, 'Home odds').toString(),
          requireOdds(body.drawOdds, 'Draw odds').toString(),
          requireOdds(body.awayOdds, 'Away odds').toString(),
          closesAt.toISOString(),
          wallet
        ]
      )
      return result.rows[0]!
    })
    return { created: true, market: serializeTestMarket(market) }
  } catch (error: any) {
    if (error?.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'That fixture ID already exists in Test Mode.' })
    }
    throw error
  }
})
