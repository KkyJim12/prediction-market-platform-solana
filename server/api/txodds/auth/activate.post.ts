import { Buffer } from 'node:buffer'
import { txOddsActivateToken, txOddsUseActivatedCredentials } from '../../../utils/txodds'

type ActivationBody = {
  guestJwt?: unknown
  txSig?: unknown
  walletSignature?: unknown
  leagues?: unknown
}

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
const SOLANA_SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{80,100}$/
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

function readRequiredString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} must be a non-empty string`
    })
  }

  return value.trim()
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store, private')
  setHeader(event, 'Pragma', 'no-cache')

  const body = await readBody<ActivationBody>(event)
  const guestJwt = readRequiredString(body?.guestJwt, 'guestJwt', 4096)
  const txSig = readRequiredString(body?.txSig, 'txSig', 128)
  const walletSignature = readRequiredString(body?.walletSignature, 'walletSignature', 256)

  if (!JWT_PATTERN.test(guestJwt)) {
    throw createError({ statusCode: 400, statusMessage: 'guestJwt is not a valid JWT' })
  }

  if (!SOLANA_SIGNATURE_PATTERN.test(txSig)) {
    throw createError({ statusCode: 400, statusMessage: 'txSig is not a valid Solana transaction signature' })
  }

  if (!BASE64_PATTERN.test(walletSignature) || Buffer.from(walletSignature, 'base64').length !== 64) {
    throw createError({
      statusCode: 400,
      statusMessage: 'walletSignature must be a base64-encoded 64-byte wallet signature'
    })
  }

  if (body.leagues !== undefined && (!Array.isArray(body.leagues) || body.leagues.length > 0)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'This route supports the World Cup free tier only; leagues must be an empty array'
    })
  }

  try {
    const response = await txOddsActivateToken(useRuntimeConfig(event), guestJwt, {
      txSig,
      walletSignature,
      leagues: []
    })
    const apiToken = typeof response === 'string' ? response : response?.token

    if (!apiToken) {
      throw createError({
        statusCode: 502,
        statusMessage: 'TxODDS activation did not return an API token'
      })
    }

    txOddsUseActivatedCredentials(apiToken, guestJwt)
    return { apiToken, activated: true }
  } catch (error: any) {
    if (error?.statusCode === 502 && error?.statusMessage) throw error

    const status = error?.response?.status ?? error?.statusCode
    if (status === 400) {
      throw createError({ statusCode: 400, statusMessage: 'TxODDS rejected the activation payload' })
    }
    if (status === 401) {
      throw createError({ statusCode: 401, statusMessage: 'The TxODDS guest JWT is invalid or expired' })
    }
    if (status === 403) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Activation rejected; verify the network, transaction, wallet, and signature'
      })
    }

    throw createError({ statusCode: 502, statusMessage: 'Unable to activate the TxODDS API token' })
  }
})
