import { useDatabase } from '../../../../utils/db'
import { requireTestWallet } from '../../../../utils/testMode'
import { serializeTestMarket, type TestMarketRow } from '../../../../utils/testMarketData'

type Body = { wallet?: unknown, result?: unknown, voided?: unknown }
type PositionRow = {
  id: string
  wallet_address: string
  outcome: number
  stake_base_units: string
  potential_payout_base_units: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  requireTestWallet(body.wallet)
  const marketId = getRouterParam(event, 'id') || ''
  const voided = body.voided === true
  const result = Number(body.result)
  if (!voided && (!Number.isInteger(result) || result < 0 || result > 2)) {
    throw createError({ statusCode: 400, statusMessage: 'Choose home, draw, away, or void.' })
  }

  const database = useDatabase(event)
  const market = await database.transaction(async (client) => {
    const marketResult = await client.query<TestMarketRow>(
      'SELECT * FROM test_markets WHERE id = $1 FOR UPDATE',
      [marketId]
    )
    const current = marketResult.rows[0]
    if (!current) throw createError({ statusCode: 404, statusMessage: 'Test market not found.' })
    if (current.status !== 'open') throw createError({ statusCode: 409, statusMessage: 'Test market is already finalized.' })

    const poolResult = await client.query<{ vault_balance_base_units: string, reserved_liability_base_units: string }>(
      'SELECT vault_balance_base_units, reserved_liability_base_units FROM test_pool WHERE id = true FOR UPDATE'
    )
    let vault = BigInt(poolResult.rows[0]!.vault_balance_base_units)
    let reserved = BigInt(poolResult.rows[0]!.reserved_liability_base_units)
    const positions = await client.query<PositionRow>(
      `SELECT id, wallet_address, outcome, stake_base_units, potential_payout_base_units
       FROM test_positions WHERE market_id = $1 AND status = 'open' FOR UPDATE`,
      [marketId]
    )

    for (const position of positions.rows) {
      const stake = BigInt(position.stake_base_units)
      const potentialPayout = BigInt(position.potential_payout_base_units)
      const won = !voided && position.outcome === result
      const amountPaid = voided ? stake : won ? potentialPayout : BigInt(0)
      reserved -= potentialPayout
      vault -= amountPaid
      await client.query(
        `UPDATE test_positions SET status = $2, amount_paid_base_units = $3,
          finalized_at = now() WHERE id = $1`,
        [position.id, voided ? 'voided' : won ? 'won' : 'lost', amountPaid.toString()]
      )
      if (amountPaid > BigInt(0)) {
        await client.query(
          `UPDATE test_users SET balance_base_units = balance_base_units + $2, updated_at = now()
           WHERE wallet_address = $1`,
          [position.wallet_address, amountPaid.toString()]
        )
      }
    }

    await client.query(
      `UPDATE test_pool SET vault_balance_base_units = $1,
       reserved_liability_base_units = $2, updated_at = now() WHERE id = true`,
      [vault.toString(), reserved.toString()]
    )
    const updated = await client.query<TestMarketRow>(
      `UPDATE test_markets SET status = $2, result = $3,
        unsettled_liability_base_units = 0, resolved_at = now()
       WHERE id = $1 RETURNING *`,
      [marketId, voided ? 'voided' : 'resolved', voided ? null : result]
    )
    return updated.rows[0]!
  })

  return { resolved: true, settledPositions: true, market: serializeTestMarket(market) }
})
