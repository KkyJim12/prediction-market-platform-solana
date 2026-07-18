export type LiveFixture = {
  fixtureId: number
  startTime: number
  competition: string
  competitionId: number
  participant1Id: number
  participant1: string
  participant2Id: number
  participant2: string
  participant1IsHome: boolean
  gameState?: number
}

export type LiveTeam = {
  teamId: number
  name: string
  competition: string
  competitionId: number
  fixtureCount: number
}

type FixturesResponse = {
  configured: boolean
  source: 'txodds' | 'fallback'
  scope: 'world-cup-free'
  updatedAt: string | null
  fixtures: LiveFixture[]
  teams: LiveTeam[]
  errorCode?: 'TXODDS_TOKEN_INVALID' | 'TXODDS_UNAVAILABLE'
  error?: string
}

const teamAliases: Record<string, string[]> = {
  Argentina: ['argentina'],
  Barcelona: ['barcelona', 'fc barcelona'],
  'Kansas City Chiefs': ['kansas city chiefs', 'chiefs'],
  'Boston Celtics': ['boston celtics', 'celtics'],
  'Philadelphia Eagles': ['philadelphia eagles', 'eagles'],
  'Los Angeles Lakers': ['los angeles lakers', 'la lakers', 'lakers']
}

function teamMatches(value: string, team: string) {
  const participant = value.toLocaleLowerCase()
  return (teamAliases[team] ?? [team.toLocaleLowerCase()])
    .some(alias => participant === alias || participant.includes(alias))
}

export function useTxOdds() {
  const { data, status, refresh } = useAsyncData<FixturesResponse>(
    'txodds-fixtures',
    () => $fetch('/api/txodds/fixtures'),
    {
      default: () => ({
        configured: false,
        source: 'fallback',
        scope: 'world-cup-free',
        updatedAt: null,
        fixtures: [],
        teams: []
      })
    }
  )

  const findTeamFixture = (team: string) => computed(() => {
    const now = Date.now() - 3 * 60 * 60 * 1000
    return data.value.fixtures.find(fixture =>
      fixture.startTime >= now &&
      (teamMatches(fixture.participant1, team) || teamMatches(fixture.participant2, team))
    )
  })

  const formatFixture = (fixture?: LiveFixture) => {
    if (!fixture) return ''
    const team1 = fixture.participant1IsHome ? fixture.participant1 : fixture.participant2
    const team2 = fixture.participant1IsHome ? fixture.participant2 : fixture.participant1
    const date = new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(fixture.startTime))
    return `${team1} vs ${team2} · ${date}`
  }

  return {
    fixtures: computed(() => data.value.fixtures),
    teams: computed(() => data.value.teams),
    updatedAt: computed(() => data.value.updatedAt),
    txOddsConfigured: computed(() => data.value.configured),
    txOddsLive: computed(() => data.value.source === 'txodds'),
    txOddsErrorCode: computed(() => data.value.errorCode),
    txOddsError: computed(() => data.value.error),
    status,
    refresh,
    findTeamFixture,
    formatFixture,
    teamMatches
  }
}
