import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js'

try {
  process.loadEnvFile?.('.env')
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}

const PROGRAM_ID = new PublicKey(
  process.env.ORACLE_PROGRAM_ID || 'FqRv1nR9E2TRQp1LXZmjp98kdWLLYDcLPD5GyUCb8dV4'
)
const RPC_URL = process.env.ORACLE_RPC_URL || 'https://api.devnet.solana.com'
const APP_ORIGIN = new URL(process.env.ORACLE_APP_ORIGIN || 'http://127.0.0.1:3000').origin
const POLL_MS = positiveInteger(process.env.ORACLE_POLL_MS, 60_000)
const FORCE_UPDATE_MS = positiveInteger(process.env.ORACLE_FORCE_UPDATE_MS, 600_000)
const ODDS_THRESHOLD = positiveNumber(process.env.ORACLE_ODDS_THRESHOLD, 0.02)
const STATE_PATH = path.resolve(process.env.ORACLE_STATE_PATH || '.data/oracle-state.json')
const ODDS_SCALE = 10_000
const MAX_MARKET_SECONDS = 1_209_600
const POOL_DISCRIMINATOR = Buffer.from([241, 154, 109, 4, 17, 177, 109, 188])
const MARKET_DISCRIMINATOR = Buffer.from([219, 190, 213, 55, 0, 227, 198, 154])
const PUBLISH_MARKET_DISCRIMINATOR = Buffer.from([145, 24, 249, 5, 188, 66, 211, 38])
const UPDATE_MARKET_ODDS_DISCRIMINATOR = Buffer.from([217, 25, 36, 45, 79, 193, 171, 87])
const [POOL_ADDRESS] = PublicKey.findProgramAddressSync([Buffer.from('pool')], PROGRAM_ID)
const connection = new Connection(RPC_URL, 'confirmed')
const lastSubmittedAt = new Map()
let running = false
let stopping = false

function positiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

function positiveNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function loadState() {
  try {
    const stored = JSON.parse(await readFile(STATE_PATH, 'utf8'))
    for (const [fixtureId, timestamp] of Object.entries(stored.lastSubmittedAt || {})) {
      if (Number.isSafeInteger(Number(timestamp)) && Number(timestamp) > 0) {
        lastSubmittedAt.set(Number(fixtureId), Number(timestamp))
      }
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn('[warn] oracle state could not be loaded; starting with an empty state')
    }
  }
}

async function saveState() {
  await mkdir(path.dirname(STATE_PATH), { recursive: true })
  const temporary = `${STATE_PATH}.${process.pid}.tmp`
  await writeFile(temporary, JSON.stringify({
    lastSubmittedAt: Object.fromEntries(lastSubmittedAt)
  }, null, 2), { encoding: 'utf8', mode: 0o600 })
  await rename(temporary, STATE_PATH)
}

function u64(value) {
  const output = Buffer.alloc(8)
  output.writeBigUInt64LE(BigInt(value))
  return output
}

function i64(value) {
  const output = Buffer.alloc(8)
  output.writeBigInt64LE(BigInt(value))
  return output
}

function marketIdentity(fixtureId) {
  const matchId = createHash('sha256').update(String(fixtureId).trim()).digest()
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), matchId],
    PROGRAM_ID
  )
  return { matchId, address }
}

function accountData(account, discriminator, minimumLength, label) {
  if (!account) return null
  if (!account.owner.equals(PROGRAM_ID)) {
    throw new Error(`${label} is not owned by the configured prediction-market program`)
  }
  if (account.data.length < minimumLength ||
    !account.data.subarray(0, 8).equals(discriminator)) {
    throw new Error(`${label} has an unexpected account layout`)
  }
  return account.data
}

async function loadOracle() {
  const configuredPath = process.env.ORACLE_KEYPAIR_PATH
  if (!configuredPath) {
    throw new Error('Set ORACLE_KEYPAIR_PATH to a protected keypair file outside this repository')
  }
  const keypairPath = path.resolve(configuredPath)
  const repository = `${path.resolve(process.cwd())}${path.sep}`.toLocaleLowerCase()
  if (`${keypairPath}${path.sep}`.toLocaleLowerCase().startsWith(repository)) {
    throw new Error('Oracle keypair files must stay outside this repository')
  }
  const secret = JSON.parse(await readFile(keypairPath, 'utf8'))
  if (!Array.isArray(secret) || secret.length !== 64) {
    throw new Error('Oracle keypair must contain a 64-byte Solana secret-key array')
  }
  return Keypair.fromSecretKey(Uint8Array.from(secret))
}

async function getPool(oracle) {
  const data = accountData(
    await connection.getAccountInfo(POOL_ADDRESS, 'confirmed'),
    POOL_DISCRIMINATOR,
    170,
    'Pool'
  )
  if (!data) throw new Error(`Pool ${POOL_ADDRESS.toBase58()} is not initialized`)
  const configuredOracle = new PublicKey(data.subarray(40, 72))
  if (!configuredOracle.equals(oracle.publicKey)) {
    throw new Error(
      `Signer ${oracle.publicKey.toBase58()} is not pool oracle ${configuredOracle.toBase58()}`
    )
  }
}

async function fetchJson(route) {
  const response = await fetch(`${APP_ORIGIN}${route}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000)
  })
  if (!response.ok) throw new Error(`${route} returned HTTP ${response.status}`)
  return response.json()
}

function primaryMarket(markets) {
  const threeWay = markets.filter(market => market.selections?.length >= 3)
  const fullMatch = threeWay.filter(market =>
    !market.period || /full|match|game|regular/i.test(market.period)
  )
  return fullMatch.find(market =>
    /1x2|match odds|full.?time result|moneyline/i.test(market.market)
  ) || fullMatch[0] || threeWay[0]
}

function findSelection(selections, names) {
  const normalized = names.map(name => String(name).trim().toLocaleLowerCase())
  return selections.find(selection =>
    normalized.includes(String(selection.name).trim().toLocaleLowerCase())
  )
}

function fixtureOdds(fixture, markets) {
  const market = primaryMarket(markets)
  if (!market) return null
  const selections = market.selections
  const part1 = findSelection(selections, [fixture.participant1, 'part1', '1', 'home']) ||
    selections[0]
  const draw = findSelection(selections, ['draw', 'x', 'tie']) || selections[1]
  const part2 = findSelection(selections, [fixture.participant2, 'part2', '2', 'away']) ||
    selections[2]
  const ordered = fixture.participant1IsHome
    ? [part1, draw, part2]
    : [part2, draw, part1]
  const values = ordered.map(selection => Number(selection?.price))
  if (values.some(value => !Number.isFinite(value) || value < 1 || value > 100)) return null
  return {
    decimal: values,
    scaled: values.map(value => Math.round(value * ODDS_SCALE))
  }
}

function decodeMarket(data) {
  return {
    odds: [
      Number(data.readBigUInt64LE(72)),
      Number(data.readBigUInt64LE(80)),
      Number(data.readBigUInt64LE(88))
    ],
    bettingClosesAt: Number(data.readBigInt64LE(96)),
    status: data[104]
  }
}

function shouldUpdate(current, next, fixtureId) {
  const threshold = Math.round(ODDS_THRESHOLD * ODDS_SCALE)
  const materiallyChanged = next.some((value, index) =>
    Math.abs(value - current[index]) >= threshold
  )
  const forceDue = Date.now() - (lastSubmittedAt.get(fixtureId) || 0) >= FORCE_UPDATE_MS
  return materiallyChanged || forceDue
}

async function simulateAndSend(instruction, oracle, label) {
  const latest = await connection.getLatestBlockhash('confirmed')
  const transaction = new Transaction({
    feePayer: oracle.publicKey,
    recentBlockhash: latest.blockhash
  }).add(instruction)
  transaction.sign(oracle)
  const simulation = await connection.simulateTransaction(transaction)
  if (simulation.value.err) {
    const detail = [...(simulation.value.logs || [])]
      .reverse()
      .find(line => /AnchorError|Error Message|custom program error/i.test(line))
    throw new Error(`${label} simulation failed: ${detail || JSON.stringify(simulation.value.err)}`)
  }
  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    maxRetries: 3
  })
  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight
  }, 'confirmed')
  if (confirmation.value.err) {
    throw new Error(`${label} confirmation failed: ${JSON.stringify(confirmation.value.err)}`)
  }
  return signature
}

async function syncFixture(fixture, oracle) {
  const now = Math.floor(Date.now() / 1000)
  const kickoff = Math.floor(Number(fixture.startTime) / 1000)
  if (!Number.isSafeInteger(kickoff) || kickoff <= now) {
    console.log(`[skip] fixture ${fixture.fixtureId}: kickoff reached; betting is closed`)
    return
  }
  if (kickoff > now + MAX_MARKET_SECONDS) {
    console.log(`[skip] fixture ${fixture.fixtureId}: kickoff is more than 14 days away`)
    return
  }

  const oddsResponse = await fetchJson(`/api/txodds/odds/${fixture.fixtureId}`)
  const odds = fixtureOdds(fixture, oddsResponse.markets || [])
  if (!odds) {
    console.log(`[skip] fixture ${fixture.fixtureId}: no valid full-match 1X2 odds`)
    return
  }

  const { matchId, address } = marketIdentity(fixture.fixtureId)
  const existing = accountData(
    await connection.getAccountInfo(address, 'confirmed'),
    MARKET_DISCRIMINATOR,
    139,
    `Market ${fixture.fixtureId}`
  )

  let instruction
  let action
  if (!existing) {
    action = 'publish'
    instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: oracle.publicKey, isSigner: true, isWritable: true },
        { pubkey: oracle.publicKey, isSigner: true, isWritable: false },
        { pubkey: POOL_ADDRESS, isSigner: false, isWritable: false },
        { pubkey: address, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data: Buffer.concat([
        PUBLISH_MARKET_DISCRIMINATOR,
        matchId,
        ...odds.scaled.map(u64),
        i64(kickoff)
      ])
    })
  } else {
    const market = decodeMarket(existing)
    if (market.status !== 0 || market.bettingClosesAt <= now) {
      console.log(`[skip] fixture ${fixture.fixtureId}: on-chain market is no longer open`)
      return
    }
    if (!shouldUpdate(market.odds, odds.scaled, fixture.fixtureId)) {
      console.log(`[skip] fixture ${fixture.fixtureId}: odds change is below ${ODDS_THRESHOLD}`)
      return
    }
    action = 'update'
    instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: oracle.publicKey, isSigner: true, isWritable: false },
        { pubkey: POOL_ADDRESS, isSigner: false, isWritable: false },
        { pubkey: address, isSigner: false, isWritable: true }
      ],
      data: Buffer.concat([
        UPDATE_MARKET_ODDS_DISCRIMINATOR,
        ...odds.scaled.map(u64)
      ])
    })
  }

  const signature = await simulateAndSend(instruction, oracle, `${action} ${fixture.fixtureId}`)
  lastSubmittedAt.set(fixture.fixtureId, Date.now())
  await saveState()
  console.log(
    `[${action}] fixture ${fixture.fixtureId} odds ${odds.decimal.map(value => value.toFixed(4)).join('/')} tx ${signature}`
  )
}

async function runCycle(oracle) {
  if (running) {
    console.log('[skip] previous oracle cycle is still running')
    return
  }
  running = true
  try {
    const response = await fetchJson('/api/txodds/fixtures')
    if (response.source !== 'txodds') {
      throw new Error(response.error || 'TxLINE fixture feed is unavailable')
    }
    for (const fixture of response.fixtures || []) {
      if (stopping) break
      try {
        await syncFixture(fixture, oracle)
      } catch (error) {
        console.error(`[error] fixture ${fixture.fixtureId}:`, error.message)
      }
    }
  } finally {
    running = false
  }
}

async function main() {
  if (!RPC_URL.startsWith('https://')) throw new Error('ORACLE_RPC_URL must use HTTPS')
  const oracle = await loadOracle()
  await getPool(oracle)
  await loadState()
  console.log(
    `[ready] oracle ${oracle.publicKey.toBase58()} · poll ${POLL_MS}ms · threshold ${ODDS_THRESHOLD} · force ${FORCE_UPDATE_MS}ms`
  )
  await runCycle(oracle)
  if (process.argv.includes('--once')) return
  const timer = setInterval(() => {
    runCycle(oracle).catch(error => console.error('[error] oracle cycle:', error.message))
  }, POLL_MS)
  timer.unref()
  await new Promise(resolve => {
    const stop = () => {
      stopping = true
      clearInterval(timer)
      resolve()
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  })
}

main().catch(error => {
  console.error('[fatal]', error.message)
  process.exitCode = 1
})
