export type TestMarket = {
  id: string
  fixtureId: string
  competition: string
  home: string
  away: string
  odds: [number, number, number]
  oddsBaseUnits: [string, string, string]
  bettingClosesAt: string
  status: 'open' | 'resolved' | 'voided'
  result: number | null
  totalStaked: number
  unsettledLiability: number
  createdBy: string
  createdAt: string
  resolvedAt: string | null
}

export function useTestPredictionMarket() {
  const { walletAddress } = useSolanaWallet()
  const markets = useState<TestMarket[]>('test-mode-markets', () => [])
  const loadingMarkets = useState('test-mode-markets-loading', () => false)
  const marketsError = useState('test-mode-markets-error', () => '')

  async function loadMarkets() {
    loadingMarkets.value = true
    marketsError.value = ''
    try {
      const response = await $fetch<{ markets: TestMarket[] }>('/api/test/markets')
      markets.value = response.markets
      return markets.value
    } catch (error: any) {
      markets.value = []
      marketsError.value = error?.data?.statusMessage || error?.message || 'Could not load Test Mode markets.'
      return markets.value
    } finally {
      loadingMarkets.value = false
    }
  }

  async function fetchPool() {
    const response = await $fetch<{ pool: {
      vaultBalance: string
      totalShares: string
      reservedLiability: string
      minStake: string
      maxPayout: string
    } }>('/api/test/pool')
    return {
      address: 'PostgreSQL test pool',
      vaultBalance: BigInt(response.pool.vaultBalance),
      totalShares: BigInt(response.pool.totalShares),
      reservedLiability: BigInt(response.pool.reservedLiability),
      minStake: BigInt(response.pool.minStake),
      maxPayout: BigInt(response.pool.maxPayout),
      paused: false
    }
  }

  async function fetchWalletState() {
    if (!walletAddress.value) throw new Error('Connect a wallet to identify your Test Mode account.')
    const state = await $fetch<{ balance: string, faucetClaimed: boolean, shares: string }>(
      `/api/test/wallet/${walletAddress.value}`
    )
    return {
      balance: BigInt(state.balance),
      faucetClaimed: state.faucetClaimed,
      shares: BigInt(state.shares)
    }
  }

  async function claimFaucet() {
    const response = await $fetch<{ reference: string }>('/api/test/faucet', {
      method: 'POST',
      body: { wallet: walletAddress.value }
    })
    return response.reference
  }

  async function updateLiquidity(action: 'deposit' | 'withdraw', amount: bigint) {
    const response = await $fetch<{ reference: string }>('/api/test/liquidity', {
      method: 'POST',
      body: { wallet: walletAddress.value, action, amountBaseUnits: amount.toString() }
    })
    return response.reference
  }

  async function placeBet(marketId: string, outcome: number, stake: bigint) {
    const response = await $fetch<{ reference: string }>('/api/test/bet', {
      method: 'POST',
      body: { wallet: walletAddress.value, marketId, outcome, stakeBaseUnits: stake.toString() }
    })
    await loadMarkets()
    return response.reference
  }

  return {
    cluster: 'test mode',
    programId: 'PostgreSQL simulation',
    markets,
    loadingMarkets,
    marketsError,
    loadMarkets,
    fetchPool,
    fetchWalletState,
    claimFaucet,
    updateLiquidity,
    placeBet
  }
}
