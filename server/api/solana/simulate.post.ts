import { solanaRpc } from '../../utils/solanaRpc'

type SimulateBody = {
  transaction?: unknown
}

type SimulateResult = {
  context: { slot: number }
  value: {
    err: unknown
    logs: string[] | null
    unitsConsumed?: number
  }
}

const BASE64_TRANSACTION_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<SimulateBody>(event)
  const transaction = typeof body?.transaction === 'string' ? body.transaction.trim() : ''
  if (!transaction || transaction.length > 2_000_000 || !BASE64_TRANSACTION_PATTERN.test(transaction)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid serialized transaction' })
  }

  const result = await solanaRpc<SimulateResult>(
    useRuntimeConfig(event),
    'simulateTransaction',
    [transaction, {
      encoding: 'base64',
      commitment: 'confirmed',
      sigVerify: false,
      replaceRecentBlockhash: true
    }],
    'prediction-market'
  )

  if (result.value.err) {
    const usefulLog = [...(result.value.logs ?? [])]
      .reverse()
      .find(log => /AnchorError|custom program error|Error Message/i.test(log))
    throw createError({
      statusCode: 422,
      statusMessage: usefulLog?.replace(/^Program log:\s*/, '').slice(0, 300)
        || `Transaction simulation failed: ${JSON.stringify(result.value.err)}`
    })
  }

  return {
    ok: true,
    slot: result.context.slot,
    unitsConsumed: result.value.unitsConsumed ?? null
  }
})
