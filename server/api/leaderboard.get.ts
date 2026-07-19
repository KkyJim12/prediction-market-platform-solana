import { useDatabase } from '../utils/db'
import { syncOpenPositions } from '../utils/positionSync'

type Metric = 'volume' | 'pnl' | 'baseVolume'
type TraderRow = {
  wallet_address: string
  volume_base_units: string
  realized_pnl_base_units: string
  base_volume_base_units: string
  trades: number
  wins: number
  losses: number
}

const metricColumns: Record<Metric, string> = {
  volume: 'volume_base_units',
  pnl: 'realized_pnl_base_units',
  baseVolume: 'base_volume_base_units'
}
const usdc = (value: string) => Number(value) / 1_000_000

export default defineEventHandler(async (event) => {
  const requestedMetric = getQuery(event).metric
  const metric: Metric = requestedMetric === 'pnl' || requestedMetric === 'baseVolume'
    ? requestedMetric
    : 'volume'
  const database = useDatabase(event)
  try {
    await syncOpenPositions(event)
  } catch {
    // Rankings remain available from the last successfully synchronized snapshot.
  }
  const result = await database.query<TraderRow>(
    `SELECT wallet_address, volume_base_units, realized_pnl_base_units,
      base_volume_base_units, trades, wins, losses
    FROM users
    WHERE trades > 0
    ORDER BY ${metricColumns[metric]} DESC, created_at ASC
    LIMIT 100`
  )

  const traders = result.rows.map(row => ({
    address: row.wallet_address,
    volume: usdc(row.volume_base_units),
    pnl: usdc(row.realized_pnl_base_units),
    baseVolume: usdc(row.base_volume_base_units),
    trades: row.trades,
    wins: row.wins,
    losses: row.losses
  }))

  return {
    metric,
    traders,
    summary: {
      trackedTraders: traders.length,
      totalVolume: traders.reduce((total, trader) => total + trader.volume, 0),
      totalTrades: traders.reduce((total, trader) => total + trader.trades, 0)
    }
  }
})
