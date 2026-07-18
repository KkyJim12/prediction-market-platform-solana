import { solanaRpc } from '../../utils/solanaRpc'

type ConfirmBody = {
  signature?: unknown
}

type SignatureStatus = {
  err: unknown
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized' | null
}

type SignatureStatusesResult = {
  value: Array<SignatureStatus | null>
}

type TransactionResult = {
  meta?: {
    logMessages?: string[] | null
  } | null
}

const SOLANA_SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{80,100}$/

async function transactionFailureMessage(config: ReturnType<typeof useRuntimeConfig>, signature: string) {
  try {
    const transaction = await solanaRpc<TransactionResult | null>(
      config,
      'getTransaction',
      [signature, {
        encoding: 'json',
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      }]
    )
    const logs = transaction?.meta?.logMessages ?? []
    const anchorError = logs.find(log => log.includes('AnchorError caused by account:'))
    if (anchorError) {
      return anchorError
        .replace(/^Program log:\s*/, '')
        .replace(/\s+/g, ' ')
        .slice(0, 280)
    }
  } catch {
    // Keep the generic failure when the RPC cannot return transaction logs.
  }

  return 'The Solana subscription transaction failed'
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<ConfirmBody>(event)
  const signature = typeof body?.signature === 'string' ? body.signature.trim() : ''

  if (!SOLANA_SIGNATURE_PATTERN.test(signature)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'signature is not a valid Solana transaction signature'
    })
  }

  const config = useRuntimeConfig(event)
  const deadline = Date.now() + 45_000

  while (Date.now() < deadline) {
    const result = await solanaRpc<SignatureStatusesResult>(
      config,
      'getSignatureStatuses',
      [[signature], { searchTransactionHistory: false }]
    )
    const status = result.value[0]

    if (status?.err) {
      throw createError({
        statusCode: 422,
        statusMessage: await transactionFailureMessage(config, signature)
      })
    }
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
      return { confirmed: true, confirmationStatus: status.confirmationStatus }
    }

    await new Promise(resolve => setTimeout(resolve, 900))
  }

  throw createError({
    statusCode: 504,
    statusMessage: 'Timed out waiting for the Solana transaction to confirm'
  })
})
