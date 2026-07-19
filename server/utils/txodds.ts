type TxOddsConfig = {
  txOddsApiOrigin: string
  txOddsApiToken: string
  txOddsGuestJwt: string
}

export type TxOddsActivationPayload = {
  txSig: string
  walletSignature: string
  leagues: number[]
}

export type TxOddsFixture = {
  Ts: number
  StartTime: number
  Competition: string
  CompetitionId: number
  FixtureGroupId: number
  Participant1Id: number
  Participant1: string
  Participant2Id: number
  Participant2: string
  FixtureId: number
  Participant1IsHome: boolean
  GameState?: number
  gameState?: number
}

export type TxOddsPrice = {
  FixtureId: number
  MessageId: string
  Ts: number
  Bookmaker: string
  BookmakerId: number
  SuperOddsType: string
  GameState?: string
  InRunning: boolean
  MarketParameters?: string
  MarketPeriod?: string
  PriceNames?: string[]
  Prices?: number[]
  Pct?: string[]
}

let cachedGuestJwt = ''
let activatedApiToken = ''

export function txOddsWorldCupCompetition(competition: string) {
  return competition.trim().toLocaleLowerCase().includes('world cup')
}

export function txOddsFreeTierCompetition(competition: string) {
  const value = competition.trim().toLocaleLowerCase()
  return txOddsWorldCupCompetition(competition) ||
    value.includes('international friendl') ||
    value.includes('int friendl')
}

function apiOrigin(config: TxOddsConfig) {
  const origin = new URL(config.txOddsApiOrigin)
  const allowedHosts = new Set(['txline.txodds.com', 'txline-dev.txodds.com'])

  if (origin.protocol !== 'https:' || !allowedHosts.has(origin.hostname)) {
    throw createError({ statusCode: 500, statusMessage: 'Unsupported TxODDS API host' })
  }

  return origin.origin
}

export async function txOddsCreateGuestSession(config: TxOddsConfig) {
  const response = await $fetch<{ token: string }>(`${apiOrigin(config)}/auth/guest/start`, {
    method: 'POST',
    timeout: 12_000
  })

  if (!response?.token) {
    throw createError({ statusCode: 502, statusMessage: 'TxODDS guest session did not return a token' })
  }

  return response.token
}

export async function txOddsActivateToken(
  config: TxOddsConfig,
  guestJwt: string,
  payload: TxOddsActivationPayload
) {
  return $fetch<{ token?: string } | string>(`${apiOrigin(config)}/api/token/activate`, {
    method: 'POST',
    timeout: 15_000,
    headers: {
      Authorization: `Bearer ${guestJwt}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: payload
  })
}

async function startGuestSession(config: TxOddsConfig, force = false) {
  if (!force && cachedGuestJwt) return cachedGuestJwt
  if (!force && config.txOddsGuestJwt) {
    cachedGuestJwt = config.txOddsGuestJwt
    return cachedGuestJwt
  }

  cachedGuestJwt = await txOddsCreateGuestSession(config)
  return cachedGuestJwt
}

export function txOddsConfigured(config: TxOddsConfig) {
  return Boolean(config.txOddsApiToken || activatedApiToken)
}

export function txOddsUseActivatedCredentials(apiToken: string, guestJwt: string) {
  activatedApiToken = apiToken
  cachedGuestJwt = guestJwt
}

export async function txOddsRequest<T>(
  config: TxOddsConfig,
  path: string,
  query?: Record<string, string | number | undefined>
) {
  if (!txOddsConfigured(config)) {
    throw createError({ statusCode: 503, statusMessage: 'TxODDS API token is not configured' })
  }

  const request = async (renewGuest = false) => {
    const jwt = await startGuestSession(config, renewGuest)
    // A newly activated token replaces the configured token for this server
    // session. Save it in the environment to preserve it after a restart.
    const apiToken = activatedApiToken || config.txOddsApiToken
    return $fetch<T>(`${apiOrigin(config)}${path}`, {
      query,
      timeout: 15_000,
      headers: {
        Authorization: `Bearer ${jwt}`,
        'X-Api-Token': apiToken,
        Accept: 'application/json'
      }
    })
  }

  try {
    return await request()
  } catch (error: any) {
    const status = error?.response?.status ?? error?.statusCode
    if (status === 401) return request(true)
    throw error
  }
}

export async function txOddsOpenStream(
  config: TxOddsConfig,
  path: string,
  signal?: AbortSignal
) {
  if (!txOddsConfigured(config)) {
    throw createError({ statusCode: 503, statusMessage: 'TxODDS API token is not configured' })
  }

  const request = async (renewGuest = false) => {
    const jwt = await startGuestSession(config, renewGuest)
    const apiToken = activatedApiToken || config.txOddsApiToken
    return fetch(`${apiOrigin(config)}${path}`, {
      signal,
      headers: {
        Authorization: `Bearer ${jwt}`,
        'X-Api-Token': apiToken,
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    })
  }

  let response = await request()
  if (response.status === 401) response = await request(true)

  if (!response.ok || !response.body) {
    throw createError({
      statusCode: response.status || 502,
      statusMessage: `TxODDS stream rejected the connection (${response.status})`
    })
  }

  return response
}
