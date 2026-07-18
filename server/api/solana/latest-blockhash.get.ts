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
  const result = await solanaRpc<LatestBlockhashResult>(
    useRuntimeConfig(event),
    'getLatestBlockhash',
    [{ commitment: 'confirmed' }]
  )

  return result.value
})
