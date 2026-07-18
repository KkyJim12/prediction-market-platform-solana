<script setup lang="ts">
const { connected, walletAddress } = useSolanaWallet()

const claimAmount = 10_000
const mockBalance = ref(0)
const lastClaim = ref('')
const requesting = ref(false)
const requestComplete = ref(false)

const storageKey = computed(() => walletAddress.value ? `cupmarket-mock-usdc:${walletAddress.value}` : '')

function openWallet() {
  if (!import.meta.client) return
  document.querySelector<HTMLButtonElement>('.cup-wallet')?.click()
}

function loadWalletBalance() {
  requestComplete.value = false
  mockBalance.value = 0
  lastClaim.value = ''
  if (!import.meta.client || !storageKey.value) return

  const saved = localStorage.getItem(storageKey.value)
  if (!saved) return

  try {
    const data = JSON.parse(saved)
    mockBalance.value = Number(data.balance) || 0
    lastClaim.value = typeof data.lastClaim === 'string' ? data.lastClaim : ''
  } catch {
    localStorage.removeItem(storageKey.value)
  }
}

async function requestMockUsdc() {
  if (!connected.value || !storageKey.value || requesting.value) return
  requesting.value = true
  requestComplete.value = false

  await new Promise(resolve => setTimeout(resolve, 650))

  mockBalance.value += claimAmount
  lastClaim.value = new Date().toISOString()
  localStorage.setItem(storageKey.value, JSON.stringify({
    balance: mockBalance.value,
    lastClaim: lastClaim.value
  }))

  requesting.value = false
  requestComplete.value = true
}

watch(walletAddress, loadWalletBalance)
onMounted(loadWalletBalance)

const formattedClaimTime = computed(() => {
  if (!lastClaim.value) return 'No requests yet'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(lastClaim.value))
})

useSeoMeta({
  title: 'Mock USDC Faucet — CupMarket',
  description: 'Request off-chain mock USDC for the CupMarket interface preview.'
})
</script>

<template>
  <main class="faucet-page">
    <section class="faucet-hero">
      <div>
        <span class="cup-kicker"><Icon name="lucide:droplets" /> DEMO ASSET FAUCET</span>
        <h1>Fuel your<br>next prediction.</h1>
        <p>Request mock USDC to explore CupMarket’s interface. This demo balance is stored in your browser and has no monetary or on-chain value.</p>
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
              <h2>Request test funds</h2>
            </div>
            <span class="faucet-network"><i /> LOCAL DEMO</span>
          </div>

          <div class="faucet-amount">
            <span>AMOUNT PER REQUEST</span>
            <div><strong>{{ claimAmount.toLocaleString() }}</strong><span>mock USDC</span></div>
          </div>

          <div class="faucet-wallet">
            <span>DESTINATION WALLET</span>
            <div v-if="connected">
              <Icon name="lucide:wallet-cards" />
              <strong>{{ walletAddress.slice(0, 7) }}…{{ walletAddress.slice(-7) }}</strong>
              <small>CONNECTED</small>
            </div>
            <div v-else class="empty">
              <Icon name="lucide:circle-dashed" />
              <strong>No wallet connected</strong>
            </div>
          </div>

          <button v-if="!connected" class="faucet-submit" type="button" @click="openWallet">
            <Icon name="lucide:wallet-cards" /> Connect wallet
          </button>
          <button v-else class="faucet-submit" type="button" :disabled="requesting" @click="requestMockUsdc">
            <Icon :name="requesting ? 'lucide:loader-circle' : 'lucide:droplets'" :class="{ spinning: requesting }" />
            {{ requesting ? 'Issuing mock USDC…' : 'Request 10,000 mock USDC' }}
          </button>

          <Transition name="fade">
            <div v-if="requestComplete" class="faucet-success">
              <Icon name="lucide:circle-check-big" />
              <div><strong>Mock funds added</strong><p>Your browser balance increased by {{ claimAmount.toLocaleString() }} mock USDC.</p></div>
            </div>
          </Transition>

          <p class="faucet-warning"><Icon name="lucide:triangle-alert" /> This faucet does not mint SPL tokens or submit a Solana transaction. Never purchase, trade, or transfer assets presented as CupMarket mock USDC.</p>
        </section>

        <aside class="faucet-sidebar">
          <div class="faucet-balance-card">
            <span>YOUR MOCK BALANCE</span>
            <strong>{{ mockBalance.toLocaleString() }}</strong>
            <small>mock USDC</small>
            <div><span>LAST REQUEST</span><b>{{ formattedClaimTime }}</b></div>
          </div>

          <div class="faucet-steps">
            <span>HOW IT WORKS</span>
            <article><b>01</b><div><strong>Connect</strong><p>Use a supported Solana browser wallet.</p></div></article>
            <article><b>02</b><div><strong>Request</strong><p>Add mock USDC to this browser session.</p></div></article>
            <article><b>03</b><div><strong>Explore</strong><p>Use the balance when demo trading is enabled.</p></div></article>
          </div>
        </aside>
      </div>
    </section>
  </main>
</template>
