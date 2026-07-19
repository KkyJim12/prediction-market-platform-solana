import { useDatabase } from '../../utils/db'

type Metric = 'volume' | 'pnl' | 'baseVolume'
const columns: Record<Metric, string> = {
  volume: 'volume_base_units',
  pnl: 'realized_pnl_base_units',
  baseVolume: 'base_volume_base_units'
}
const usdc = (value: string) => Number(value) / 1_000_000

export default defineEventHandler(async (event) => {
  const requested = getQuery(event).metric
  const metric: Metric = requested === 'pnl' || requested === 'baseVolume' ? requested : 'volume'
  const result = await useDatabase(event).query<{
    wallet_address: string
    volume_base_units: string
    realized_pnl_base_units: string
    base_volume_base_units: string
    trades: number
    wins: number
    losses: number
  }>(
    `SELECT wallet_address, volume_base_units, realized_pnl_base_units,
      base_volume_base_units, trades, wins, losses
     FROM test_users WHERE trades > 0
     ORDER BY ${columns[metric]} DESC, created_at ASC LIMIT 100`
  )
  return {
    metric,
    traders: result.rows.map(row => ({
      address: row.wallet_address,
      volume: usdc(row.volume_base_units),
      pnl: usdc(row.realized_pnl_base_units),
      baseVolume: usdc(row.base_volume_base_units),
      trades: row.trades,
      wins: row.wins,
      losses: row.losses
    }))
  }
})
