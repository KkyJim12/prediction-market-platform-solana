import { randomUUID } from 'node:crypto'
import { useDatabase } from '../../utils/db'
import { requireBaseUnits, requireTestWallet, TEST_ODDS_SCALE } from '../../utils/testMode'

type Body = { wallet?: unknown, marketId?: unknown, outcome?: unknown, stakeBaseUnits?: unknown }
type MarketRow = {
  id: string
  home_team: string
  away_team: string
  home_odds: string
  draw_odds: string
  away_odds: string
  betting_closes_at: Date | string
  status: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  const wallet = requireTestWallet(body.wallet)
  const marketId = typeof body.marketId === 'string' ? body.marketId : ''
  const outcome = Number(body.outcome)
  const stake = requireBaseUnits(body.stakeBaseUnits, 'Stake')
  if (!Number.isInteger(outcome) || outcome < 0 || outcome > 2) {
    throw createError({ statusCode: 400, statusMessage: 'Choose home, draw, or away.' })
  }

  const database = useDatabase(event)
  const position = await database.transaction(async (client) => {
    await client.query(
      'INSERT INTO test_users (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING',
      [wallet]
    )
    const [userResult, marketResult, poolResult] = await Promise.all([
      client.query<{ balance_base_units: string }>(
        'SELECT balance_base_units FROM test_users WHERE wallet_address = $1 FOR UPDATE',
        [wallet]
      ),
      client.query<MarketRow>('SELECT * FROM test_markets WHERE id = $1 FOR UPDATE', [marketId]),
      client.query<{
        vault_balance_base_units: string
        reserved_liability_base_units: string
        min_stake_base_units: string
        max_payout_base_units: string
      }>('SELECT * FROM test_pool WHERE id = true FOR UPDATE')
    ])
    const market = marketResult.rows[0]
    const pool = poolResult.rows[0]
    if (!market) throw createError({ statusCode: 404, statusMessage: 'Test market not found.' })
    if (market.status !== 'open' || new Date(market.betting_closes_at).getTime() <= Date.now()) {
      throw createError({ statusCode: 409, statusMessage: 'Betting is closed for this test market.' })
    }

    const balance = BigInt(userResult.rows[0]!.balance_base_units)
    const vault = BigInt(pool!.vault_balance_base_units)
    const reserved = BigInt(pool!.reserved_liability_base_units)
    if (stake < BigInt(pool!.min_stake_base_units)) {
      throw createError({ statusCode: 400, statusMessage: 'Minimum test stake is 1 mock USDC.' })
    }
    if (stake > balance) {
      throw createError({ statusCode: 400, statusMessage: 'Your Test Mode balance is too low. Use the faucet first.' })
    }
    const odds = BigInt([market.home_odds, market.draw_odds, market.away_odds][outcome]!)
    const payout = stake * odds / TEST_ODDS_SCALE
    if (payout > BigInt(pool!.max_payout_base_units)) {
      throw createError({ statusCode: 400, statusMessage: 'This test position exceeds the pool maximum payout.' })
    }
    if (vault + stake < reserved + payout) {
      throw createError({ statusCode: 409, statusMessage: 'The test pool does not have enough available liquidity.' })
    }

    const id = randomUUID()
    const selection = outcome === 0 ? market.home_team : outcome === 1 ? 'Draw' : market.away_team
    await client.query(
      `UPDATE test_users SET balance_base_units = balance_base_units - $2, updated_at = now()
       WHERE wallet_address = $1`,
      [wallet, stake.toString()]
    )
    await client.query(
      `UPDATE test_pool SET vault_balance_base_units = vault_balance_base_units + $1,
       reserved_liability_base_units = reserved_liability_base_units + $2, updated_at = now()
       WHERE id = true`,
      [stake.toString(), payout.toString()]
    )
    await client.query(
      `UPDATE test_markets SET total_staked_base_units = total_staked_base_units + $2,
       unsettled_liability_base_units = unsettled_liability_base_units + $3 WHERE id = $1`,
      [marketId, stake.toString(), payout.toString()]
    )
    await client.query(
      `INSERT INTO test_positions (
        id, wallet_address, market_id, outcome, selection, stake_base_units,
        locked_odds, potential_payout_base_units
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, wallet, marketId, outcome, selection, stake.toString(), odds.toString(), payout.toString()]
    )
    return { id, selection, stake, odds, payout }
  })

  return {
    placed: true,
    reference: `test-${position.id}`,
    position: {
      id: position.id,
      selection: position.selection,
      stakeBaseUnits: position.stake.toString(),
      lockedOdds: position.odds.toString(),
      potentialPayoutBaseUnits: position.payout.toString()
    }
  }
})
