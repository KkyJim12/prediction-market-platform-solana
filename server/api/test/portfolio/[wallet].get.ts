import { useDatabase } from '../../../utils/db'
import { requireTestWallet } from '../../../utils/testMode'

const usdc = (value: string | null | undefined) => Number(value || 0) / 1_000_000

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const wallet = requireTestWallet(getRouterParam(event, 'wallet'))
  const database = useDatabase(event)
  await database.query(
    'INSERT INTO test_users (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING',
    [wallet]
  )
  const [userResult, positionsResult] = await Promise.all([
    database.query<{
      volume_base_units: string
      realized_pnl_base_units: string
      base_volume_base_units: string
      trades: number
      wins: number
      losses: number
      rank: string
    }>(
      `SELECT ranked.* FROM (
        SELECT u.*, rank() OVER (ORDER BY volume_base_units DESC, created_at ASC) AS rank
        FROM test_users u
      ) ranked WHERE wallet_address = $1`,
      [wallet]
    ),
    database.query<{
      id: string
      fixture_id: string
      competition: string
      home_team: string
      away_team: string
      selection: string
      outcome: number
      stake_base_units: string
      locked_odds: string
      potential_payout_base_units: string
      amount_paid_base_units: string | null
      status: 'open' | 'won' | 'lost' | 'voided'
      opened_at: string
      finalized_at: string | null
    }>(
      `SELECT p.id, m.fixture_id, m.competition, m.home_team, m.away_team,
        p.selection, p.outcome, p.stake_base_units, p.locked_odds,
        p.potential_payout_base_units, p.amount_paid_base_units, p.status,
        p.opened_at, p.finalized_at
       FROM test_positions p JOIN test_markets m ON m.id = p.market_id
       WHERE p.wallet_address = $1 ORDER BY p.opened_at DESC LIMIT 250`,
      [wallet]
    )
  ])
  const user = userResult.rows[0]
  return {
    stats: {
      walletAddress: wallet,
      volume: usdc(user?.volume_base_units),
      pnl: usdc(user?.realized_pnl_base_units),
      baseVolume: usdc(user?.base_volume_base_units),
      trades: user?.trades ?? 0,
      wins: user?.wins ?? 0,
      losses: user?.losses ?? 0,
      rank: user ? Number(user.rank) : null
    },
    positions: positionsResult.rows.map(position => ({
      id: position.id,
      fixtureId: position.fixture_id,
      competition: position.competition,
      home: position.home_team,
      away: position.away_team,
      selection: position.selection,
      outcome: position.outcome,
      stake: usdc(position.stake_base_units),
      odds: Number(position.locked_odds) / 10_000,
      potentialPayout: usdc(position.potential_payout_base_units),
      amountPaid: position.amount_paid_base_units === null ? null : usdc(position.amount_paid_base_units),
      status: position.status,
      signature: `test-${position.id}`,
      openedAt: position.opened_at,
      finalizedAt: position.finalized_at
    }))
  }
})
