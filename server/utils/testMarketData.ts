export type TestMarketRow = {
  id: string
  fixture_id: string
  competition: string
  home_team: string
  away_team: string
  home_odds: string
  draw_odds: string
  away_odds: string
  betting_closes_at: Date | string
  status: 'open' | 'resolved' | 'voided'
  result: number | null
  total_staked_base_units: string
  unsettled_liability_base_units: string
  created_by: string
  created_at: Date | string
  resolved_at: Date | string | null
}

export function serializeTestMarket(row: TestMarketRow) {
  return {
    id: row.id,
    fixtureId: row.fixture_id,
    competition: row.competition,
    home: row.home_team,
    away: row.away_team,
    odds: [Number(row.home_odds) / 10_000, Number(row.draw_odds) / 10_000, Number(row.away_odds) / 10_000],
    oddsBaseUnits: [row.home_odds, row.draw_odds, row.away_odds],
    bettingClosesAt: new Date(row.betting_closes_at).toISOString(),
    status: row.status,
    result: row.result,
    totalStaked: Number(row.total_staked_base_units) / 1_000_000,
    unsettledLiability: Number(row.unsettled_liability_base_units) / 1_000_000,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at).toISOString(),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null
  }
}
