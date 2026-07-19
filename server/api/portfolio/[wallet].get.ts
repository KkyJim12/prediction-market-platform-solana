import { PublicKey } from '@solana/web3.js'
import { useDatabase } from '../../utils/db'
import { syncOpenPositions } from '../../utils/positionSync'

type UserRow = {
  wallet_address: string
  volume_base_units: string
  realized_pnl_base_units: string
  base_volume_base_units: string
  trades: number
  wins: number
  losses: number
  rank: string
}

type PositionRow = {
  position_id: string
  bet_address: string
  market_address: string
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
  open_signature: string
  settle_signature: string | null
  opened_at: string
  finalized_at: string | null
}

const usdc = (value: string | null) => Number(value || 0) / 1_000_000

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const wallet = getRouterParam(event, 'wallet') || ''
  try {
    if (new PublicKey(wallet).toBase58() !== wallet) throw new Error()
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Solana wallet address.' })
  }

  const database = useDatabase(event)
  try {
    await syncOpenPositions(event, wallet)
  } catch {
    // Serve the last indexed snapshot when Solana RPC is temporarily unavailable.
  }
  const [userResult, positionsResult] = await Promise.all([
    database.query<UserRow>(
      `SELECT ranked.* FROM (
        SELECT u.*, rank() OVER (ORDER BY volume_base_units DESC, created_at ASC) AS rank
        FROM users u
      ) ranked WHERE wallet_address = $1`,
      [wallet]
    ),
    database.query<PositionRow>(
      `SELECT position_id, bet_address, market_address, fixture_id, competition,
        home_team, away_team, selection, outcome, stake_base_units, locked_odds,
        potential_payout_base_units, amount_paid_base_units, status,
        open_signature, settle_signature, opened_at, finalized_at
      FROM positions WHERE wallet_address = $1
      ORDER BY opened_at DESC LIMIT 250`,
      [wallet]
    )
  ])
  const user = userResult.rows[0]

  return {
    stats: {
      walletAddress: wallet,
      volume: usdc(user?.volume_base_units ?? null),
      pnl: usdc(user?.realized_pnl_base_units ?? null),
      baseVolume: usdc(user?.base_volume_base_units ?? null),
      trades: user?.trades ?? 0,
      wins: user?.wins ?? 0,
      losses: user?.losses ?? 0,
      rank: user ? Number(user.rank) : null
    },
    positions: positionsResult.rows.map(position => ({
      id: position.position_id,
      betAddress: position.bet_address,
      marketAddress: position.market_address,
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
      signature: position.open_signature,
      settleSignature: position.settle_signature,
      openedAt: position.opened_at,
      finalizedAt: position.finalized_at
    }))
  }
})
