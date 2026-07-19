import { PublicKey } from '@solana/web3.js'

export const TEST_USDC_SCALE = BigInt(1_000_000)
export const TEST_ODDS_SCALE = BigInt(10_000)

export function requireTestWallet(value: unknown) {
  const wallet = typeof value === 'string' ? value.trim() : ''
  try {
    if (new PublicKey(wallet).toBase58() !== wallet) throw new Error()
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'A valid connected Solana wallet is required.' })
  }
  return wallet
}

export function requireBaseUnits(value: unknown, label = 'Amount') {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!/^\d{1,20}$/.test(normalized)) {
    throw createError({ statusCode: 400, statusMessage: `${label} must be a positive integer in base units.` })
  }
  const amount = BigInt(normalized)
  if (amount <= BigInt(0)) {
    throw createError({ statusCode: 400, statusMessage: `${label} must be greater than zero.` })
  }
  return amount
}

export function requireOdds(value: unknown, label: string) {
  const odds = Number(value)
  if (!Number.isInteger(odds) || odds < 10_001 || odds > 1_000_000) {
    throw createError({ statusCode: 400, statusMessage: `${label} must be decimal odds above 1.0000.` })
  }
  return BigInt(odds)
}

export function text(value: unknown, maximum: number, fallback = '') {
  const output = typeof value === 'string' ? value.trim().slice(0, maximum) : ''
  return output || fallback
}
