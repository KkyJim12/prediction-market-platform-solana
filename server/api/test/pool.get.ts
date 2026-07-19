import { useDatabase } from '../../utils/db'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const result = await useDatabase(event).query<{
    vault_balance_base_units: string
    total_shares: string
    reserved_liability_base_units: string
    min_stake_base_units: string
    max_payout_base_units: string
  }>('SELECT * FROM test_pool WHERE id = true')
  const pool = result.rows[0]!
  return {
    pool: {
      vaultBalance: pool.vault_balance_base_units,
      totalShares: pool.total_shares,
      reservedLiability: pool.reserved_liability_base_units,
      minStake: pool.min_stake_base_units,
      maxPayout: pool.max_payout_base_units
    }
  }
})
