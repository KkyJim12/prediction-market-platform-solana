import type { TxOddsFixture } from '../../utils/txodds'
import {
  txOddsConfigured,
  txOddsFreeTierCompetition,
  txOddsRequest
} from '../../utils/txodds'

function normalizeFixture(fixture: TxOddsFixture) {
  return {
    fixtureId: fixture.FixtureId,
    startTime: fixture.StartTime < 10_000_000_000
      ? fixture.StartTime * 1000
      : fixture.StartTime,
    competition: fixture.Competition,
    competitionId: fixture.CompetitionId,
    participant1Id: fixture.Participant1Id,
    participant1: fixture.Participant1,
    participant2Id: fixture.Participant2Id,
    participant2: fixture.Participant2,
    participant1IsHome: fixture.Participant1IsHome,
    gameState: fixture.GameState ?? fixture.gameState ?? 1
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!txOddsConfigured(config)) {
    return {
      configured: false,
      source: 'fallback' as const,
      scope: 'world-cup-free' as const,
      updatedAt: null,
      fixtures: [],
      teams: []
    }
  }

  try {
    const now = Date.now()
    const startEpochDay = Math.floor((now - 6 * 60 * 60 * 1000) / 86_400_000)
    const snapshot = await txOddsRequest<TxOddsFixture[]>(
      config,
      '/api/fixtures/snapshot',
      { startEpochDay }
    )

    const normalizedFixtures = snapshot
      .map(normalizeFixture)
      .filter(fixture =>
        txOddsFreeTierCompetition(fixture.competition) &&
        fixture.gameState !== 6 &&
        fixture.startTime >= now - 6 * 60 * 60 * 1000
      )
      .sort((a, b) => a.startTime - b.startTime)

    const fixtures = normalizedFixtures
      .map(({ gameState, ...fixture }) => ({ ...fixture, gameState }))

    const teamMap = new Map<number, {
      teamId: number
      name: string
      competition: string
      competitionId: number
      fixtureCount: number
    }>()

    for (const fixture of normalizedFixtures) {
      const participants = [
        { teamId: fixture.participant1Id, name: fixture.participant1 },
        { teamId: fixture.participant2Id, name: fixture.participant2 }
      ]

      for (const participant of participants) {
        const existing = teamMap.get(participant.teamId)
        if (existing) {
          existing.fixtureCount += 1
        } else {
          teamMap.set(participant.teamId, {
            ...participant,
            competition: fixture.competition,
            competitionId: fixture.competitionId,
            fixtureCount: 1
          })
        }
      }
    }

    return {
      configured: true,
      source: 'txodds' as const,
      scope: 'world-cup-free' as const,
      updatedAt: new Date().toISOString(),
      fixtures,
      teams: [...teamMap.values()].sort((a, b) => a.name.localeCompare(b.name))
    }
  } catch (error: any) {
    const status = error?.response?.status ?? error?.statusCode
    const tokenRejected = status === 403
    console.error('TxODDS fixtures request failed', error?.statusMessage ?? error?.message)
    return {
      configured: true,
      source: 'fallback' as const,
      scope: 'world-cup-free' as const,
      updatedAt: null,
      fixtures: [],
      teams: [],
      errorCode: tokenRejected ? 'TXODDS_TOKEN_INVALID' as const : 'TXODDS_UNAVAILABLE' as const,
      error: tokenRejected
        ? 'The TxLINE API token is invalid or has not been activated.'
        : 'Live fixtures are temporarily unavailable.'
    }
  }
})
