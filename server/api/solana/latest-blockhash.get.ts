import { solanaRpc } from '../../utils/solanaRpc'

type LatestBlockhashResult = {
  context: {
    slot: number
  }
  value: {
    blockhash: string
    lastValidBlockHeight: number
  }
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const scope = getQuery(event).scope === 'prediction-market'
    ? 'prediction-market'
    : 'txodds'
  const result = await solanaRpc<LatestBlockhashResult>(
    useRuntimeConfig(event),
    'getLatestBlockhash',
    [{ commitment: 'confirmed' }],
    scope
  )

  return result.value
})
