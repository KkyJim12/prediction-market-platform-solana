<script setup lang="ts">
const colorMode = useColorMode()
const route = useRoute()
const walletOpen = ref(false)
const mobileNavOpen = ref(false)
const connectedWallet = ref('')
const walletMessage = ref('')

const walletLabel = computed(() => connectedWallet.value || 'Connect wallet')

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
})

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

async function connectWallet(providerName: 'Phantom' | 'Solflare') {
  walletMessage.value = ''
  if (!import.meta.client) return
  const provider = providerName === 'Phantom' ? (window as any).solana : (window as any).solflare

  if (!provider) {
    walletMessage.value = `${providerName} was not found. Install the wallet extension, then try again.`
    return
  }

  try {
    const response = await provider.connect()
    const key = response?.publicKey?.toString?.() || provider.publicKey?.toString?.()
    connectedWallet.value = key ? `${key.slice(0, 4)}…${key.slice(-4)}` : providerName
    walletOpen.value = false
  } catch {
    walletMessage.value = 'Connection was cancelled. Your wallet was not changed.'
  }
}
</script>

<template>
  <div class="app-shell">
    <NuxtRouteAnnouncer />
    <header class="topbar">
      <NuxtLink class="brand" to="/" aria-label="Contraria home">
        <span class="brand-mark"><span /></span>
        <span>CONTRARIA</span>
      </NuxtLink>

      <nav class="desktop-nav" aria-label="Main navigation">
        <NuxtLink class="nav-link" to="/">Home</NuxtLink>
        <NuxtLink class="nav-link" to="/pools">Pools</NuxtLink>
        <NuxtLink class="nav-link" to="/portfolio">Portfolio</NuxtLink>
      </nav>

      <div class="header-actions">
        <div class="network-pill"><span class="network-dot" /><span>MAINNET</span></div>
        <button class="icon-button" type="button" :title="colorMode.value === 'dark' ? 'Use light mode' : 'Use dark mode'" @click="toggleTheme">
          <Icon :name="colorMode.value === 'dark' ? 'lucide:sun' : 'lucide:moon'" />
        </button>
        <button class="wallet-button" type="button" @click="walletOpen = true">
          <span class="wallet-orb">◎</span>{{ walletLabel }}
        </button>
        <button class="mobile-menu" type="button" title="Open menu" @click="mobileNavOpen = !mobileNavOpen">
          <Icon name="lucide:menu" />
        </button>
      </div>
    </header>

    <Transition name="fade">
      <nav v-if="mobileNavOpen" class="mobile-nav">
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/pools">Pools</NuxtLink>
        <NuxtLink to="/portfolio">Portfolio</NuxtLink>
      </nav>
    </Transition>

    <NuxtPage />

    <footer class="site-footer">
      <NuxtLink class="brand" to="/"><span class="brand-mark"><span /></span><span>CONTRARIA</span></NuxtLink>
      <p>Team strategies. Transparent backtests. Settled on Solana.</p>
      <div><a href="#">Docs</a><a href="#">Methodology</a><a href="#">X / Twitter</a></div>
    </footer>

    <Transition name="modal-slide">
      <div v-if="walletOpen" class="modal-backdrop" @click.self="walletOpen = false">
        <section class="modal wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
          <button class="modal-close" type="button" title="Close" @click="walletOpen = false"><Icon name="lucide:x" /></button>
          <div class="modal-kicker"><span class="wallet-orb">◎</span> SOLANA MAINNET</div>
          <h2 id="wallet-title">Connect a wallet</h2>
          <p>Choose a Solana wallet to access team pools. Contraria never takes custody of your assets.</p>
          <div class="wallet-options">
            <button type="button" @click="connectWallet('Phantom')">
              <span class="phantom-logo">P</span><span><strong>Phantom</strong><small>Browser extension</small></span><Icon name="lucide:chevron-right" />
            </button>
            <button type="button" @click="connectWallet('Solflare')">
              <span class="solflare-logo">S</span><span><strong>Solflare</strong><small>Browser extension</small></span><Icon name="lucide:chevron-right" />
            </button>
          </div>
          <div v-if="walletMessage" class="wallet-message"><Icon name="lucide:info" />{{ walletMessage }}</div>
          <div class="trust-row"><Icon name="lucide:shield-check" /> Non-custodial & on-chain</div>
        </section>
      </div>
    </Transition>
  </div>
</template>
