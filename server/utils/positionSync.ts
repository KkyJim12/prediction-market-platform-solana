import type { H3Event } from 'h3'
import bs58 from 'bs58'
import { solanaRpc } from './solanaRpc'
import { useDatabase } from './db'

const BET_DISCRIMINATOR = Uint8Array.from([147, 23, 35, 59, 15, 75, 155, 32])
const MARKET_DISCRIMINATOR = Uint8Array.from([219, 190, 213, 55, 0, 227, 198, 154])

type OpenPositionRow = {
  position_id: string
  bet_address: string
  market_address: string
  wallet_address: string
  stake_base_units: string
  potential_payout_base_units: string
}

type RpcAccount = {
  data: [string, 'base64']
  owner: string
}

type MultipleAccountsResult = {
  value: Array<RpcAccount | null>
}

function matches(data: Uint8Array, discriminator: Uint8Array) {
  return discriminator.every((byte, index) => data[index] === byte)
}

async function getAccounts(event: H3Event, addresses: string[]) {
  const config = useRuntimeConfig(event)
  const accounts = new Map<string, RpcAccount | null>()
  for (let offset = 0; offset < addresses.length; offset += 100) {
    const batch = addresses.slice(offset, offset + 100)
    const result = await solanaRpc<MultipleAccountsResult>(
      config,
      'getMultipleAccounts',
      [batch, { encoding: 'base64', commitment: 'confirmed' }],
      'prediction-market'
    )
    batch.forEach((address, index) => accounts.set(address, result.value[index] ?? null))
  }
  return accounts
}

export async function syncOpenPositions(event: H3Event, walletAddress?: string) {
  const database = useDatabase(event)
  const result = await database.query<OpenPositionRow>(
    `SELECT position_id, bet_address, market_address, wallet_address, stake_base_units,
      potential_payout_base_units
    FROM positions
    WHERE status = 'open' ${walletAddress ? 'AND wallet_address = $1' : ''}
    ORDER BY opened_at ASC
    LIMIT 250`,
    walletAddress ? [walletAddress] : []
  )
  if (!result.rows.length) return

  const addresses = [...new Set(result.rows.flatMap(row => [row.bet_address, row.market_address]))]
  const accounts = await getAccounts(event, addresses)
  const expectedOwner = String(useRuntimeConfig(event).public.predictionMarketProgramId)

  await database.transaction(async (client) => {
    for (const position of result.rows) {
      const betAccount = accounts.get(position.bet_address)
      const marketAccount = accounts.get(position.market_address)
      if (!betAccount || !marketAccount || betAccount.owner !== expectedOwner || marketAccount.owner !== expectedOwner) {
        continue
      }
      const bet = Buffer.from(betAccount.data[0], 'base64')
      const market = Buffer.from(marketAccount.data[0], 'base64')
      if (
        bet.length < 172 ||
        market.length < 139 ||
        !matches(bet, BET_DISCRIMINATOR) ||
        !matches(market, MARKET_DISCRIMINATOR) ||
        bet.subarray(8, 40).toString('hex') !== position.position_id ||
        bs58.encode(bet.subarray(72, 104)) !== position.market_address ||
        bs58.encode(bet.subarray(104, 136)) !== position.wallet_address ||
        bet.readBigUInt64LE(137).toString() !== position.stake_base_units ||
        bet.readBigUInt64LE(153).toString() !== position.potential_payout_base_units
      ) {
        continue
      }
      const settled = bet[169] === 1
      if (!settled) continue

      const won = bet[170] === 1
      const voided = market[104] === 2
      const status = voided ? 'voided' : won ? 'won' : 'lost'
      const amountPaid = voided
        ? position.stake_base_units
        : won
          ? position.potential_payout_base_units
          : '0'

      await client.query(
        `UPDATE positions SET status = $2, amount_paid_base_units = $3,
          finalized_at = COALESCE(finalized_at, now()), updated_at = now()
        WHERE position_id = $1 AND status = 'open'`,
        [position.position_id, status, amountPaid]
      )
    }
  })
}
