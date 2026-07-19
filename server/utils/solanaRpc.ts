type SolanaRpcConfig = {
  solanaRpcUrl?: string
  predictionMarketRpcUrl?: string
}

type SolanaRpcResponse<T> = {
  jsonrpc: '2.0'
  id: number
  result?: T
  error?: {
    code: number
    message: string
  }
}

let requestId = 0

export async function solanaRpc<T>(
  config: SolanaRpcConfig,
  method: string,
  params: unknown[] = [],
  scope: 'txodds' | 'prediction-market' = 'txodds'
) {
  const configuredUrl = scope === 'prediction-market'
    ? config.predictionMarketRpcUrl || 'https://api.devnet.solana.com'
    : config.solanaRpcUrl || 'https://api.mainnet-beta.solana.com'
  const rpcUrl = new URL(configuredUrl)
  if (rpcUrl.protocol !== 'https:') {
    throw createError({ statusCode: 500, statusMessage: 'Solana RPC URL must use HTTPS' })
  }

  let response: SolanaRpcResponse<T>
  try {
    response = await $fetch<SolanaRpcResponse<T>>(rpcUrl.toString(), {
      method: 'POST',
      timeout: 15_000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: {
        jsonrpc: '2.0',
        id: ++requestId,
        method,
        params
      }
    })
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'The configured Solana RPC is unavailable'
    })
  }

  if (response.error) {
    throw createError({
      statusCode: 502,
      statusMessage: `Solana RPC rejected ${method}: ${response.error.message}`
    })
  }
  if (response.result === undefined) {
    throw createError({
      statusCode: 502,
      statusMessage: `Solana RPC returned no result for ${method}`
    })
  }

  return response.result
}
