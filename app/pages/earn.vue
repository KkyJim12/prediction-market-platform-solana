<script setup lang="ts">
const { connected, walletAddress } = useSolanaWallet()
const { mode, isTestMode } = useAppMode()
const {
  cluster,
  programId,
  fetchPool,
  fetchWalletState,
  fundPool,
  withdrawPool,
  explorerTransactionUrl
} = usePredictionMarket()
const testMarket = useTestPredictionMarket()

const amount = ref('100')
const action = ref<'deposit' | 'withdraw'>('deposit')
const pool = ref<Awaited<ReturnType<typeof fetchPool>>>(null)
const shares = ref(0n)
const balance = ref(0n)
const pending = ref(false)
const errorMessage = ref('')
const transactionSignature = ref('')

function openWallet() {
  if (!import.meta.client) return
  document.querySelector<HTMLButtonElement>('.cup-wallet')?.click()
}

const netEquity = computed(() => pool.value
  ? pool.value.vaultBalance - pool.value.reservedLiability
  : 0n
)
const utilization = computed(() => pool.value?.vaultBalance
  ? Number(pool.value.reservedLiability * 10_000n / pool.value.vaultBalance) / 100
  : 0
)
const positionValue = computed(() => pool.value?.totalShares
  ? shares.value * netEquity.value / pool.value.totalShares
  : 0n
)
const parsedAmount = computed<bigint | null>(() => {
  try {
    const value = parseMockUsdc(amount.value)
    return value > 0n ? value : null
  } catch {
    return null
  }
})
const depositShares = computed(() => {
  const value = parsedAmount.value
  if (!value || !pool.value) return 0n
  if (pool.value.totalShares === 0n) return value
  if (netEquity.value <= 0n) return 0n
  return value * pool.value.totalShares / netEquity.value
})
const withdrawalShares = computed(() => {
  const value = parsedAmount.value
  if (!value || !pool.value || netEquity.value <= 0n || pool.value.totalShares === 0n) return 0n
  if (value >= positionValue.value) return shares.value
  return value * pool.value.totalShares / netEquity.value
})
const withdrawalAmount = computed(() => pool.value?.totalShares && withdrawalShares.value
  ? withdrawalShares.value * netEquity.value / pool.value.totalShares
  : 0n
)
const availableAmount = computed(() => action.value === 'deposit' ? balance.value : positionValue.value)
const amountError = computed(() => {
  if (!amount.value.trim()) return ''
  if (!parsedAmount.value) return 'Enter an amount greater than zero with no more than 6 decimals.'
  if (parsedAmount.value > availableAmount.value) {
    return action.value === 'deposit'
      ? 'Deposit exceeds your mock USDC balance.'
      : 'Withdrawal exceeds your current LP position value.'
  }
  if (action.value === 'deposit' && depositShares.value === 0n) {
    return 'This deposit is too small to mint one LP share.'
  }
  if (action.value === 'withdraw' && withdrawalShares.value === 0n) {
    return 'This withdrawal is too small to redeem one LP share.'
  }
  return ''
})
const canSubmit = computed(() =>
  Boolean(connected.value && pool.value && parsedAmount.value && !amountError.value && !pending.value)
)

function setAction(nextAction: 'deposit' | 'withdraw') {
  action.value = nextAction
  amount.value = '100'
  errorMessage.value = ''
  transactionSignature.value = ''
}

function setPercentage(percent: bigint) {
  const available = availableAmount.value
  const selected = percent === 100n ? available : available * percent / 100n
  amount.value = formatMockUsdc(selected, 6)
}

async function refreshOnChainState() {
  errorMessage.value = ''
  try {
    pool.value = isTestMode.value ? await testMarket.fetchPool() : await fetchPool()
    if (walletAddress.value) {
      const state = isTestMode.value ? await testMarket.fetchWalletState() : await fetchWalletState()
      shares.value = state.shares
      balance.value = state.balance
    } else {
      shares.value = 0n
      balance.value = 0n
    }
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Could not read the liquidity pool.'
  }
}

async function submitLiquidity() {
  if (!canSubmit.value || !parsedAmount.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    await refreshOnChainState()
    if (errorMessage.value || !parsedAmount.value || amountError.value) return
    transactionSignature.value = isTestMode.value
      ? await testMarket.updateLiquidity(action.value, parsedAmount.value)
      : action.value === 'deposit'
        ? await fundPool(parsedAmount.value)
        : await withdrawPool(withdrawalShares.value)
    await refreshOnChainState()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'The liquidity transaction failed.'
  } finally {
    pending.value = false
  }
}

watch([walletAddress, mode], refreshOnChainState)
onMounted(refreshOnChainState)

useSeoMeta({
  description: 'Supply or withdraw mock USDC from the CupMarket counterparty liquidity pool.'
})
</script>

<template>
  <main class="earn-page">
    <section class="earn-hero">
      <div>
        <span class="cup-kicker"><Icon name="lucide:landmark" /> {{ isTestMode ? 'DATABASE TEST LIQUIDITY' : 'COUNTERPARTY LIQUIDITY' }}</span>
        <h1>Earn from the other side.</h1>
        <p>{{ isTestMode ? 'Exercise the complete liquidity flow against the isolated test pool in PostgreSQL. No deposit or withdrawal is sent on-chain.' : 'Supply mock USDC to back prediction-market trades. When traders lose, the pool gains. When traders win, the pool pays their profit and liquidity providers absorb the loss pro rata.' }}</p>
        <div class="earn-hero-tags">
          <span><Icon name="lucide:circle-dollar-sign" /> Mock USDC vault</span>
          <span><Icon name="lucide:scale" /> Pro-rata P&amp;L</span>
          <span><Icon name="lucide:shield-alert" /> Principal at risk</span>
        </div>
      </div>

      <div class="earn-model-badge">
        <span>POOL STATUS</span>
        <strong><i /> {{ pool ? (isTestMode ? 'LIVE IN TEST DATABASE' : `LIVE ON ${cluster.toUpperCase()}`) : 'NOT INITIALIZED' }}</strong>
        <p>{{ pool ? (isTestMode ? 'Reading the isolated test_pool state from PostgreSQL.' : 'Reading the single counterparty pool directly from Solana.') : `No pool account was found for ${programId} on ${cluster}.` }}</p>
      </div>
    </section>

    <section class="earn-content">
      <div class="earn-metrics">
        <div><span>POOL TVL</span><strong>{{ pool ? formatMockUsdc(pool.vaultBalance) : '—' }}</strong><small>mock USDC in vault</small></div>
        <div><span>NET EQUITY</span><strong>{{ pool ? formatMockUsdc(netEquity) : '—' }}</strong><small>After reserved payouts</small></div>
        <div><span>UTILIZATION</span><strong>{{ pool ? `${utilization.toFixed(2)}%` : '—' }}</strong><small>Reserved / vault</small></div>
        <div><span>YOUR POSITION</span><strong>{{ connected ? formatMockUsdc(positionValue) : '—' }}</strong><small>{{ shares.toString() }} internal shares</small></div>
      </div>

      <div class="earn-main-grid">
        <section class="earn-explainer">
          <div class="earn-section-label">HOW THE POOL WORKS</div>
          <h2>Liquidity providers become the market counterparty.</h2>

          <div class="earn-flow">
            <article>
              <b>01</b>
              <Icon name="lucide:wallet-minimal" />
              <div><h3>Supply mock USDC</h3><p>Your deposit receives internal LP shares representing a pro-rata claim on pool assets.</p></div>
            </article>
            <article>
              <b>02</b>
              <Icon name="lucide:repeat-2" />
              <div><h3>Back market exposure</h3><p>The pool provides collateral against trader positions subject to utilization and exposure limits.</p></div>
            </article>
            <article>
              <b>03</b>
              <Icon name="lucide:scale" />
              <div><h3>Redeem LP shares</h3><p>Enter a mock USDC amount and the app converts it to the correct internal share quantity before signing.</p></div>
            </article>
          </div>

          <div class="earn-outcome-grid">
            <div class="pool-wins">
              <span>TRADER LOSES</span>
              <Icon name="lucide:trending-up" />
              <strong>Pool gains</strong>
              <p>Lost trader collateral remains in the pool and raises the value of each LP share.</p>
            </div>
            <div class="pool-loses">
              <span>TRADER WINS</span>
              <Icon name="lucide:trending-down" />
              <strong>Pool pays</strong>
              <p>Winning payouts come from pool collateral and lower the value of each LP share.</p>
            </div>
          </div>
        </section>

        <aside class="earn-ticket">
          <div class="earn-ticket-head">
            <div>
              <span>MOCK USDC COUNTERPARTY POOL</span>
              <h2>Liquidity transaction</h2>
            </div>
            <span class="preview-pill">{{ isTestMode ? 'TEST DATABASE' : cluster.toUpperCase() }}</span>
          </div>

          <div class="earn-action-tabs">
            <button type="button" :class="{ active: action === 'deposit' }" @click="setAction('deposit')">Deposit</button>
            <button type="button" :class="{ active: action === 'withdraw' }" @click="setAction('withdraw')">Withdraw</button>
          </div>

          <label class="earn-amount">
            <span>{{ action === 'deposit' ? 'AMOUNT TO SUPPLY' : 'AMOUNT TO WITHDRAW' }}</span>
            <div>
              <input v-model="amount" type="text" inputmode="decimal" autocomplete="off" aria-label="Liquidity amount">
              <strong>mock USDC</strong>
            </div>
          </label>

          <div class="earn-quick-amounts">
            <button v-for="percent in [25n, 50n, 75n, 100n]" :key="percent.toString()" type="button" @click="setPercentage(percent)">
              {{ percent === 100n ? 'MAX' : `${percent}%` }}
            </button>
          </div>

          <div class="earn-quote-rows">
            <div>
              <span>{{ action === 'deposit' ? 'Wallet balance' : 'Position value' }}</span>
              <strong>{{ formatMockUsdc(availableAmount, 6) }} mock USDC</strong>
            </div>
            <div>
              <span>{{ isTestMode ? 'Database amount' : 'On-chain token amount' }}</span>
              <strong>{{ parsedAmount?.toString() || '—' }} base units</strong>
            </div>
            <div class="earn-quote-total">
              <span>{{ action === 'deposit' ? 'Estimated shares received' : 'LP shares to redeem' }}</span>
              <strong>{{ action === 'deposit' ? depositShares.toString() : withdrawalShares.toString() }}</strong>
            </div>
            <div v-if="action === 'withdraw'">
              <span>Estimated amount received</span>
              <strong>{{ formatMockUsdc(withdrawalAmount, 6) }} mock USDC</strong>
            </div>
          </div>

          <div v-if="amountError" class="trade-bet-error"><Icon name="lucide:circle-alert" />{{ amountError }}</div>

          <button v-if="!connected" class="earn-submit" type="button" @click="openWallet">
            <Icon name="lucide:wallet-cards" /> Connect wallet
          </button>
          <button v-else class="earn-submit" type="button" :disabled="!canSubmit" @click="submitLiquidity">
            <Icon :name="pending ? 'lucide:loader-circle' : action === 'deposit' ? 'lucide:landmark' : 'lucide:arrow-down-to-line'" />
            {{ pending ? (isTestMode ? 'Saving…' : 'Simulating & submitting…') : action === 'deposit' ? 'Deposit mock USDC' : 'Withdraw mock USDC' }}
          </button>

          <div v-if="connected" class="earn-wallet-row">
            <span>CONNECTED WALLET</span>
            <strong>{{ walletAddress.slice(0, 5) }}…{{ walletAddress.slice(-5) }}</strong>
          </div>

          <div v-if="errorMessage" class="trade-bet-error"><Icon name="lucide:circle-alert" />{{ errorMessage }}</div>
          <p v-if="transactionSignature">
            <span v-if="isTestMode"><Icon name="lucide:circle-check" /> Saved as {{ transactionSignature }}</span>
            <a v-else :href="explorerTransactionUrl(transactionSignature)" target="_blank" rel="noopener">View confirmed transaction</a>
          </p>
          <p class="earn-risk"><Icon name="lucide:triangle-alert" /> {{ isTestMode ? `Database simulation only: ${amount || '0'} mock USDC ${action}; no wallet signature and no Solana transaction.` : `Review: ${amount || '0'} mock USDC ${action}; fee payer ${walletAddress || 'connected wallet'}; cluster ${cluster}; program ${programId}. Transactions are simulated before signing.` }} Liquidity provision is not yield-guaranteed and pool losses can reduce principal.</p>
        </aside>
      </div>
    </section>
  </main>
</template>
