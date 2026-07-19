import bs58 from 'bs58'
import { PublicKey } from '@solana/web3.js'
import { solanaRpc } from '../../utils/solanaRpc'
import { useDatabase } from '../../utils/db'

const PLACE_BET_DISCRIMINATOR = Uint8Array.from([222, 62, 67, 220, 63, 166, 126, 33])
const SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{80,100}$/
const POSITION_ID_PATTERN = /^[0-9a-f]{64}$/

type Body = {
  signature?: unknown
  positionId?: unknown
  betAddress?: unknown
  fixtureId?: unknown
  competition?: unknown
  home?: unknown
  away?: unknown
  selection?: unknown
}

type CompiledInstruction = {
  programIdIndex: number
  accounts: number[]
  data: string
}

type ConfirmedTransaction = {
  blockTime?: number | null
  meta?: {
    err?: unknown
    loadedAddresses?: { writable: string[], readonly: string[] }
  } | null
  transaction: {
    message: {
      accountKeys: string[]
      header: { numRequiredSignatures: number }
      instructions: CompiledInstruction[]
    }
  }
}

function boundedText(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : ''
}

function readU64(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(offset, true)
}

function equalsBytes(value: Uint8Array, expected: Uint8Array) {
  return expected.every((byte, index) => value[index] === byte)
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<Body>(event)
  const signature = boundedText(body.signature, 100)
  const positionId = boundedText(body.positionId, 64).toLowerCase()
  const requestedBetAddress = boundedText(body.betAddress, 44)
  const fixtureId = boundedText(String(body.fixtureId ?? ''), 64)

  if (!SIGNATURE_PATTERN.test(signature) || !POSITION_ID_PATTERN.test(positionId) || !fixtureId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid position indexing request.' })
  }
  try {
    new PublicKey(requestedBetAddress)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid bet account address.' })
  }

  const config = useRuntimeConfig(event)
  let transaction: ConfirmedTransaction | null = null
  for (let attempt = 0; attempt < 6 && !transaction; attempt += 1) {
    transaction = await solanaRpc<ConfirmedTransaction | null>(
      config,
      'getTransaction',
      [signature, {
        encoding: 'json',
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      }],
      'prediction-market'
    )
    if (!transaction && attempt < 5) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  if (!transaction || transaction.meta?.err) {
    throw createError({ statusCode: 422, statusMessage: 'The confirmed bet transaction was not found.' })
  }

  const message = transaction.transaction.message
  const accountKeys = [
    ...message.accountKeys,
    ...(transaction.meta?.loadedAddresses?.writable ?? []),
    ...(transaction.meta?.loadedAddresses?.readonly ?? [])
  ]
  const expectedProgram = String(config.public.predictionMarketProgramId)
  const instruction = message.instructions.find((candidate) => {
    if (accountKeys[candidate.programIdIndex] !== expectedProgram) return false
    try {
      const data = bs58.decode(candidate.data)
      return data.length >= 57 && equalsBytes(data, PLACE_BET_DISCRIMINATOR)
    } catch {
      return false
    }
  })

  if (!instruction || instruction.accounts.length < 7) {
    throw createError({ statusCode: 422, statusMessage: 'Transaction does not contain a valid place_bet instruction.' })
  }
  const instructionData = bs58.decode(instruction.data)
  const decodedPositionId = Buffer.from(instructionData.slice(8, 40)).toString('hex')
  const walletAddress = accountKeys[instruction.accounts[0]!] || ''
  const marketAddress = accountKeys[instruction.accounts[5]!] || ''
  const betAddress = accountKeys[instruction.accounts[6]!] || ''
  const walletKeyIndex = accountKeys.indexOf(walletAddress)
  const outcome = instructionData[40]!
  const stake = readU64(instructionData, 41)
  const lockedOdds = readU64(instructionData, 49)

  if (
    decodedPositionId !== positionId ||
    betAddress !== requestedBetAddress ||
    walletKeyIndex < 0 ||
    walletKeyIndex >= message.header.numRequiredSignatures ||
    outcome > 2 ||
    stake === BigInt(0) ||
    lockedOdds === BigInt(0)
  ) {
    throw createError({ statusCode: 422, statusMessage: 'Bet transaction details do not match this position.' })
  }

  const payout = stake * lockedOdds / BigInt(10_000)
  const openedAt = transaction.blockTime
    ? new Date(transaction.blockTime * 1000).toISOString()
    : new Date().toISOString()
  const database = useDatabase(event)

  const position = await database.transaction(async (client) => {
    await client.query(
      `INSERT INTO users (wallet_address) VALUES ($1)
       ON CONFLICT (wallet_address) DO NOTHING`,
      [walletAddress]
    )
    const result = await client.query(
      `INSERT INTO positions (
        position_id, bet_address, wallet_address, market_address, fixture_id,
        competition, home_team, away_team, selection, outcome,
        stake_base_units, locked_odds, potential_payout_base_units,
        open_signature, opened_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      ON CONFLICT (position_id) DO UPDATE SET
        competition = EXCLUDED.competition,
        home_team = EXCLUDED.home_team,
        away_team = EXCLUDED.away_team,
        selection = EXCLUDED.selection,
        updated_at = now()
      WHERE positions.open_signature = EXCLUDED.open_signature
      RETURNING position_id, bet_address, wallet_address, status`,
      [
        positionId,
        betAddress,
        walletAddress,
        marketAddress,
        fixtureId,
        boundedText(body.competition, 160),
        boundedText(body.home, 160),
        boundedText(body.away, 160),
        boundedText(body.selection, 160),
        outcome,
        stake.toString(),
        lockedOdds.toString(),
        payout.toString(),
        signature,
        openedAt
      ]
    )
    if (!result.rows[0]) {
      throw createError({ statusCode: 409, statusMessage: 'Position ID is already indexed by another transaction.' })
    }
    return result.rows[0]
  })

  return { indexed: true, position }
})
