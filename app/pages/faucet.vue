<script setup lang="ts">
const { connected, walletAddress } = useSolanaWallet()
const { mode, isTestMode } = useAppMode()
const {
  cluster,
  programId,
  claimFaucet,
  fetchWalletState,
  explorerTransactionUrl
} = usePredictionMarket()
const testMarket = useTestPredictionMarket()

const claimAmount = 1_000
const mockBalance = ref(0n)
const alreadyClaimed = ref(false)
const requesting = ref(false)
const requestComplete = ref(false)
const errorMessage = ref('')
const transactionSignature = ref('')

function openWallet() {
  if (!import.meta.client) return
  document.querySelector<HTMLButtonElement>('.cup-wallet')?.click()
}

async function loadWalletBalance() {
  requestComplete.value = false
  errorMessage.value = ''
  mockBalance.value = 0n
  alreadyClaimed.value = false
  if (!import.meta.client || !walletAddress.value) return

  try {
    const state = isTestMode.value ? await testMarket.fetchWalletState() : await fetchWalletState()
    mockBalance.value = state.balance
    alreadyClaimed.value = state.faucetClaimed
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Could not read the faucet state.'
  }
}

async function requestMockUsdc() {
  if (!connected.value || requesting.value || alreadyClaimed.value) return
  requesting.value = true
  requestComplete.value = false
  errorMessage.value = ''
  try {
    transactionSignature.value = isTestMode.value ? await testMarket.claimFaucet() : await claimFaucet()
    await loadWalletBalance()
    requestComplete.value = true
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'The faucet transaction failed.'
  } finally {
    requesting.value = false
  }
}

watch([walletAddress, mode], loadWalletBalance)
onMounted(loadWalletBalance)

useSeoMeta({
  description: 'Claim on-chain mock USDC from the CupMarket Solana program.'
})
</script>

<template>
  <main class="faucet-page">
    <section class="faucet-hero">
      <div>
        <span class="cup-kicker"><Icon name="lucide:droplets" /> {{ isTestMode ? 'TEST DATABASE FAUCET' : 'DEVNET ASSET FAUCET' }}</span>
        <h1>Fuel your<br>next prediction.</h1>
        <p>{{ isTestMode ? 'Add demo-only mock USDC to your isolated PostgreSQL account. Nothing is minted and no transaction is sent.' : 'Claim mock USDC from the CupMarket program for devnet betting and liquidity transactions. The token has no monetary value.' }}</p>
      </div>
      <div class="faucet-token-art" aria-hidden="true">
        <div class="faucet-orbit orbit-one" />
        <div class="faucet-orbit orbit-two" />
        <div class="faucet-coin"><span>$</span><strong>USDC</strong><small>MOCK</small></div>
      </div>
    </section>

    <section class="faucet-content">
      <div class="faucet-grid">
        <section class="faucet-card">
          <div class="faucet-card-head">
            <div>
              <span>MOCK USDC FAUCET</span>
              <h2>Claim test funds</h2>
            </div>
            <span class="faucet-network"><i /> {{ isTestMode ? 'POSTGRESQL TEST' : `SOLANA ${cluster.toUpperCase()}` }}</span>
          </div>

          <div class="faucet-amount">
            <span>ONE-TIME CLAIM</span>
            <div><strong>{{ claimAmount.toLocaleString() }}</strong><span>mock USDC</span></div>
          </div>

          <div class="faucet-wallet">
            <span>DESTINATION WALLET</span>
            <div v-if="connected">
              <Icon name="lucide:wallet-cards" />
              <strong>{{ walletAddress.slice(0, 7) }}…{{ walletAddress.slice(-7) }}</strong>
              <small>FEE PAYER</small>
            </div>
            <div v-else class="empty">
              <Icon name="lucide:circle-dashed" />
              <strong>No wallet connected</strong>
            </div>
          </div>

          <button v-if="!connected" class="faucet-submit" type="button" @click="openWallet">
            <Icon name="lucide:wallet-cards" /> Connect wallet
          </button>
          <button v-else class="faucet-submit" type="button" :disabled="requesting || alreadyClaimed" @click="requestMockUsdc">
            <Icon :name="requesting ? 'lucide:loader-circle' : alreadyClaimed ? 'lucide:circle-check' : 'lucide:droplets'" :class="{ spinning: requesting }" />
            {{ alreadyClaimed ? 'Faucet already claimed' : requesting ? (isTestMode ? 'Saving…' : 'Simulating & submitting…') : isTestMode ? 'Add 1,000 demo USDC' : 'Claim 1,000 mock USDC' }}
          </button>

          <Transition name="fade">
            <div v-if="requestComplete" class="faucet-success">
              <Icon name="lucide:circle-check-big" />
              <div>
                <strong>{{ isTestMode ? 'Demo balance added' : 'Mock USDC minted on-chain' }}</strong>
                <p>
                  {{ isTestMode ? `PostgreSQL credited ${claimAmount.toLocaleString()} mock USDC with no signature.` : `The confirmed transaction minted ${claimAmount.toLocaleString()} mock USDC.` }}
                  <a v-if="!isTestMode" :href="explorerTransactionUrl(transactionSignature)" target="_blank" rel="noopener">View transaction</a>
                </p>
              </div>
            </div>
          </Transition>

          <div v-if="errorMessage" class="trade-bet-error"><Icon name="lucide:circle-alert" />{{ errorMessage }}</div>
          <p class="faucet-warning"><Icon name="lucide:triangle-alert" /> {{ isTestMode ? 'Database simulation only. Your public key identifies the test account; there is no signature or on-chain transaction.' : `Review: claim ${claimAmount.toLocaleString()} mock USDC; fee payer ${walletAddress || 'connected wallet'}; cluster ${cluster}; program ${programId}. The transaction is simulated before signing.` }}</p>
        </section>

        <aside class="faucet-sidebar">
          <div class="faucet-balance-card">
            <span>{{ isTestMode ? 'TEST DATABASE BALANCE' : 'ON-CHAIN BALANCE' }}</span>
            <strong>{{ formatMockUsdc(mockBalance) }}</strong>
            <small>mock USDC</small>
            <div><span>CLAIM STATUS</span><b>{{ alreadyClaimed ? 'Claimed' : 'Available' }}</b></div>
          </div>

          <div class="faucet-steps">
            <span>HOW IT WORKS</span>
            <article><b>01</b><div><strong>Connect</strong><p>Use a supported Solana browser wallet.</p></div></article>
            <article><b>02</b><div><strong>{{ isTestMode ? 'Save' : 'Simulate & sign' }}</strong><p>{{ isTestMode ? 'Credit the isolated test_users record once.' : 'The contract mints once per wallet after simulation.' }}</p></div></article>
            <article><b>03</b><div><strong>Trade</strong><p>{{ isTestMode ? 'Use the balance in database-backed demo markets.' : 'Use the SPL balance in published on-chain markets.' }}</p></div></article>
          </div>
        </aside>
      </div>
    </section>
  </main>
</template>
