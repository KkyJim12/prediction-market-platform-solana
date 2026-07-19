import { randomUUID } from 'node:crypto'
import { useDatabase } from '../../utils/db'
import { requireBaseUnits, requireTestWallet } from '../../utils/testMode'

type Body = { wallet?: unknown, action?: unknown, amountBaseUnits?: unknown }

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  const wallet = requireTestWallet(body.wallet)
  const action = body.action === 'withdraw' ? 'withdraw' : body.action === 'deposit' ? 'deposit' : ''
  const requested = requireBaseUnits(body.amountBaseUnits)
  if (!action) throw createError({ statusCode: 400, statusMessage: 'Choose deposit or withdraw.' })

  const database = useDatabase(event)
  const state = await database.transaction(async (client) => {
    await client.query(
      'INSERT INTO test_users (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING',
      [wallet]
    )
    const userResult = await client.query<{ balance_base_units: string, lp_shares: string }>(
      'SELECT balance_base_units, lp_shares FROM test_users WHERE wallet_address = $1 FOR UPDATE',
      [wallet]
    )
    const poolResult = await client.query<{
      vault_balance_base_units: string
      total_shares: string
      reserved_liability_base_units: string
    }>('SELECT * FROM test_pool WHERE id = true FOR UPDATE')
    const user = userResult.rows[0]!
    const pool = poolResult.rows[0]!
    const balance = BigInt(user.balance_base_units)
    const ownedShares = BigInt(user.lp_shares)
    const vault = BigInt(pool.vault_balance_base_units)
    const totalShares = BigInt(pool.total_shares)
    const reserved = BigInt(pool.reserved_liability_base_units)
    const equity = vault - reserved
    if (equity <= BigInt(0)) throw createError({ statusCode: 409, statusMessage: 'The test pool has no redeemable equity.' })

    if (action === 'deposit') {
      if (requested > balance) {
        throw createError({ statusCode: 400, statusMessage: 'Your Test Mode balance is too low.' })
      }
      const shares = totalShares === BigInt(0) ? requested : requested * totalShares / equity
      if (shares <= BigInt(0)) throw createError({ statusCode: 400, statusMessage: 'Deposit is too small to mint an LP share.' })
      await client.query(
        `UPDATE test_users SET balance_base_units = balance_base_units - $2,
         lp_shares = lp_shares + $3, updated_at = now() WHERE wallet_address = $1`,
        [wallet, requested.toString(), shares.toString()]
      )
      await client.query(
        `UPDATE test_pool SET vault_balance_base_units = vault_balance_base_units + $1,
         total_shares = total_shares + $2, updated_at = now() WHERE id = true`,
        [requested.toString(), shares.toString()]
      )
      return { amount: requested, shares }
    }

    if (ownedShares <= BigInt(0) || totalShares <= BigInt(0)) {
      throw createError({ statusCode: 400, statusMessage: 'You do not own any Test Mode LP shares.' })
    }
    const positionValue = ownedShares * equity / totalShares
    if (requested > positionValue) {
      throw createError({ statusCode: 400, statusMessage: 'Withdrawal exceeds your Test Mode LP position.' })
    }
    const shares = requested >= positionValue ? ownedShares : requested * totalShares / equity
    if (shares <= BigInt(0)) throw createError({ statusCode: 400, statusMessage: 'Withdrawal is too small to redeem an LP share.' })
    const payout = shares * equity / totalShares
    if (vault - payout < reserved) {
      throw createError({ statusCode: 409, statusMessage: 'That liquidity is reserved for open test positions.' })
    }
    await client.query(
      `UPDATE test_users SET balance_base_units = balance_base_units + $2,
       lp_shares = lp_shares - $3, updated_at = now() WHERE wallet_address = $1`,
      [wallet, payout.toString(), shares.toString()]
    )
    await client.query(
      `UPDATE test_pool SET vault_balance_base_units = vault_balance_base_units - $1,
       total_shares = total_shares - $2, updated_at = now() WHERE id = true`,
      [payout.toString(), shares.toString()]
    )
    return { amount: payout, shares }
  })

  const reference = `test-liquidity-${randomUUID()}`
  return {
    completed: true,
    action,
    reference,
    amountBaseUnits: state.amount.toString(),
    shares: state.shares.toString()
  }
})
