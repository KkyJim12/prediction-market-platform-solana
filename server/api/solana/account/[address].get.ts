import { solanaRpc } from '../../../utils/solanaRpc'

const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

type AccountInfoResult = {
  context: { slot: number }
  value: {
    data: [string, 'base64']
    executable: boolean
    lamports: number
    owner: string
  } | null
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const address = getRouterParam(event, 'address')?.trim() || ''
  if (!SOLANA_ADDRESS_PATTERN.test(address)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Solana account address' })
  }

  const result = await solanaRpc<AccountInfoResult>(
    useRuntimeConfig(event),
    'getAccountInfo',
    [address, { encoding: 'base64', commitment: 'confirmed' }],
    'prediction-market'
  )

  return {
    slot: result.context.slot,
    account: result.value
  }
})
