import { useDatabase } from '../../../utils/db'
import { requireTestWallet } from '../../../utils/testMode'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const wallet = requireTestWallet(getRouterParam(event, 'wallet'))
  const database = useDatabase(event)
  await database.query(
    'INSERT INTO test_users (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING',
    [wallet]
  )
  const result = await database.query<{
    balance_base_units: string
    faucet_claimed: boolean
    lp_shares: string
  }>('SELECT balance_base_units, faucet_claimed, lp_shares FROM test_users WHERE wallet_address = $1', [wallet])
  const user = result.rows[0]!
  return { balance: user.balance_base_units, faucetClaimed: user.faucet_claimed, shares: user.lp_shares }
})
