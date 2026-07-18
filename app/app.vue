<script setup lang="ts">
const colorMode = useColorMode()
const route = useRoute()
const walletOpen = ref(false)
const mobileNavOpen = ref(false)
const walletMessage = ref('')
const { walletLabel, connect } = useSolanaWallet()

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
})

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

async function connectWallet(providerName: 'Phantom' | 'Solflare') {
  walletMessage.value = ''

  try {
    await connect(providerName)
    walletOpen.value = false
  } catch (error: any) {
    walletMessage.value = error?.message || 'Connection was cancelled.'
  }
}
</script>

<template>
  <div class="app-shell cup-shell">
    <NuxtRouteAnnouncer />
    <header class="cup-topbar">
      <NuxtLink class="cup-brand" to="/" aria-label="CupMarket home">
        <span class="cup-brand-ball"><i /><i /><i /></span>
        <span>CUP<span>MARKET</span></span>
      </NuxtLink>

      <nav class="desktop-nav cup-nav" aria-label="Main navigation">
        <NuxtLink class="nav-link" to="/matches">Markets</NuxtLink>
        <NuxtLink class="nav-link" to="/earn">Earn</NuxtLink>
        <NuxtLink class="nav-link" to="/leaderboard">Leaderboard</NuxtLink>
        <NuxtLink class="nav-link" to="/faucet">Faucet</NuxtLink>
        <NuxtLink class="nav-link" to="/portfolio">Portfolio</NuxtLink>
        <NuxtLink class="nav-link" to="/settings">Settings</NuxtLink>
      </nav>

      <div class="header-actions">
        <div class="network-pill"><span class="network-dot" /><span>SOLANA</span></div>
        <button class="icon-button" type="button" :title="colorMode.value === 'dark' ? 'Use light mode' : 'Use dark mode'" @click="toggleTheme">
          <Icon :name="colorMode.value === 'dark' ? 'lucide:sun' : 'lucide:moon'" />
        </button>
        <button class="wallet-button cup-wallet" type="button" @click="walletOpen = true">
          <Icon name="lucide:wallet-cards" />{{ walletLabel }}
        </button>
        <button class="mobile-menu" type="button" title="Open menu" @click="mobileNavOpen = !mobileNavOpen">
          <Icon name="lucide:menu" />
        </button>
      </div>
    </header>

    <Transition name="fade">
      <nav v-if="mobileNavOpen" class="mobile-nav cup-mobile-nav">
        <NuxtLink to="/matches">Markets</NuxtLink>
        <NuxtLink to="/earn">Earn</NuxtLink>
        <NuxtLink to="/leaderboard">Leaderboard</NuxtLink>
        <NuxtLink to="/faucet">Faucet</NuxtLink>
        <NuxtLink to="/portfolio">Portfolio</NuxtLink>
        <NuxtLink to="/settings">Settings</NuxtLink>
      </nav>
    </Transition>

    <NuxtPage />

    <footer class="cup-footer">
      <div>
        <NuxtLink class="cup-brand" to="/">
          <span class="cup-brand-ball"><i /><i /><i /></span>
          <span>CUP<span>MARKET</span></span>
        </NuxtLink>
        <p>World Cup prediction markets powered by TxLINE free-tier data and an AMM on Solana.</p>
      </div>
      <div class="cup-footer-meta">
        <span><i class="network-dot" /> TXLINE DATA</span>
        <span>AMM PREVIEW</span>
        <span>NON-CUSTODIAL</span>
      </div>
    </footer>

    <Transition name="modal-slide">
      <div v-if="walletOpen" class="modal-backdrop" @click.self="walletOpen = false">
        <section class="modal wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
          <button class="modal-close" type="button" title="Close" @click="walletOpen = false"><Icon name="lucide:x" /></button>
          <div class="modal-kicker"><Icon name="lucide:shield-check" /> SOLANA WALLET</div>
          <h2 id="wallet-title">Connect to trade</h2>
          <p>Choose a wallet to preview and, when market contracts are enabled, submit trades on-chain.</p>
          <div class="wallet-options">
            <button type="button" data-testid="connect-phantom" @click="connectWallet('Phantom')">
              <span class="phantom-logo">P</span><span><strong>Phantom</strong><small>Browser extension</small></span><Icon name="lucide:chevron-right" />
            </button>
            <button type="button" data-testid="connect-solflare" @click="connectWallet('Solflare')">
              <span class="solflare-logo">S</span><span><strong>Solflare</strong><small>Browser extension</small></span><Icon name="lucide:chevron-right" />
            </button>
          </div>
          <div v-if="walletMessage" class="wallet-message"><Icon name="lucide:info" />{{ walletMessage }}</div>
          <div class="trust-row"><Icon name="lucide:lock-keyhole" /> Your assets stay in your wallet</div>
        </section>
      </div>
    </Transition>
  </div>
</template>
