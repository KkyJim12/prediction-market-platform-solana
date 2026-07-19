import { useDatabase } from '../../utils/db'
import { requireTestWallet } from '../../utils/testMode'

export default defineEventHandler(async (event) => {
  const wallet = requireTestWallet((await readBody<{ wallet?: unknown }>(event)).wallet)
  const result = await useDatabase(event).query<{ balance_base_units: string }>(
    `INSERT INTO test_users (wallet_address, balance_base_units, faucet_claimed)
     VALUES ($1, 1000000000, true)
     ON CONFLICT (wallet_address) DO UPDATE SET
       balance_base_units = test_users.balance_base_units + 1000000000,
       faucet_claimed = true,
       updated_at = now()
     WHERE test_users.faucet_claimed = false
     RETURNING balance_base_units`,
    [wallet]
  )
  if (!result.rows[0]) throw createError({ statusCode: 409, statusMessage: 'Test Mode faucet already claimed.' })
  return {
    claimed: true,
    reference: `test-faucet-${wallet.slice(0, 8)}`,
    amountBaseUnits: '1000000000',
    balanceBaseUnits: result.rows[0].balance_base_units
  }
})
