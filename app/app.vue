<script setup lang="ts">
const colorMode = useColorMode()
const route = useRoute()
const walletOpen = ref(false)
const walletMenuOpen = ref(false)
const walletControl = ref<HTMLElement>()
const modeControl = ref<HTMLElement>()
const modeMenuOpen = ref(false)
const mobileNavOpen = ref(false)
const walletMessage = ref('')
const { mode, isTestMode, setMode, restoreMode } = useAppMode()
const {
  walletName,
  walletAddress,
  walletLabel,
  connected,
  connect,
  restore,
  disconnect
} = useSolanaWallet()

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
  walletMenuOpen.value = false
  modeMenuOpen.value = false
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

function toggleWallet() {
  if (connected.value) {
    walletMenuOpen.value = !walletMenuOpen.value
  } else {
    walletOpen.value = true
  }
}

async function logoutWallet() {
  walletMenuOpen.value = false
  await disconnect()
}

function closeWalletMenu(event: MouseEvent) {
  if (!walletControl.value?.contains(event.target as Node)) walletMenuOpen.value = false
  if (!modeControl.value?.contains(event.target as Node)) modeMenuOpen.value = false
}

function closeWalletMenuOnEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    walletMenuOpen.value = false
    modeMenuOpen.value = false
  }
}

function chooseMode(nextMode: AppMode) {
  setMode(nextMode)
  modeMenuOpen.value = false
}

onMounted(async () => {
  document.addEventListener('click', closeWalletMenu)
  document.addEventListener('keydown', closeWalletMenuOnEscape)
  restoreMode()
  await restore()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeWalletMenu)
  document.removeEventListener('keydown', closeWalletMenuOnEscape)
})
</script>

<template>
  <div class="app-shell cup-shell">
    <NuxtRouteAnnouncer />
    <header class="cup-topbar">
      <NuxtLink class="cup-brand" to="/" aria-label="PurpleX home">
        <img class="cup-brand-logo cup-brand-logo-light" src="/logo-light.png" alt="PurpleX">
        <img class="cup-brand-logo cup-brand-logo-dark" src="/logo-dark.png" alt="">
      </NuxtLink>

      <nav class="desktop-nav cup-nav" aria-label="Main navigation">
        <NuxtLink class="nav-link" to="/matches">Markets</NuxtLink>
        <NuxtLink class="nav-link" to="/earn">Earn</NuxtLink>
        <NuxtLink class="nav-link" to="/leaderboard">Leaderboard</NuxtLink>
        <NuxtLink class="nav-link" to="/faucet">Faucet</NuxtLink>
        <NuxtLink class="nav-link" to="/portfolio">Portfolio</NuxtLink>
        <NuxtLink v-if="isTestMode" class="nav-link test-management-link" to="/management">Management</NuxtLink>
        <NuxtLink class="nav-link" to="/settings">Settings</NuxtLink>
      </nav>

      <div class="header-actions">
        <div ref="modeControl" class="app-mode-control">
          <button
            class="app-mode-trigger"
            type="button"
            aria-haspopup="menu"
            :aria-expanded="modeMenuOpen"
            @click="modeMenuOpen = !modeMenuOpen"
          >
            <span class="app-mode-trigger-icon" :class="{ test: isTestMode }">
              <Icon :name="isTestMode ? 'lucide:flask-conical' : 'lucide:blocks'" />
            </span>
            <span class="app-mode-trigger-copy">
              <small>ENVIRONMENT</small>
              <strong>{{ isTestMode ? 'Test Mode' : 'Main' }}</strong>
            </span>
            <Icon class="app-mode-chevron" name="lucide:chevron-down" :class="{ open: modeMenuOpen }" />
          </button>
          <Transition name="dropdown-pop">
            <div v-if="modeMenuOpen" class="app-mode-menu" role="menu">
              <div class="app-mode-menu-head">
                <span>SELECT ENVIRONMENT</span>
                <small>Changes platform data and execution</small>
              </div>
              <button type="button" role="menuitemradio" :aria-checked="mode === 'main'" @click="chooseMode('main')">
                <i class="app-mode-option-icon"><Icon name="lucide:blocks" /></i>
                <span><strong>Main</strong><small>Solana Devnet · On-chain</small></span>
                <i class="app-mode-selected"><Icon v-if="mode === 'main'" name="lucide:check" /></i>
              </button>
              <button type="button" role="menuitemradio" :aria-checked="mode === 'test'" @click="chooseMode('test')">
                <i class="app-mode-option-icon test"><Icon name="lucide:flask-conical" /></i>
                <span><strong>Test Mode</strong><small>PostgreSQL · No transactions</small></span>
                <i class="app-mode-selected"><Icon v-if="mode === 'test'" name="lucide:check" /></i>
              </button>
            </div>
          </Transition>
        </div>
        <div class="network-pill" :class="{ test: isTestMode }">
          <span class="network-dot" /><span>{{ isTestMode ? 'DATABASE TEST' : 'SOLANA DEVNET' }}</span>
        </div>
        <button class="icon-button" type="button" :title="colorMode.value === 'dark' ? 'Use light mode' : 'Use dark mode'" @click="toggleTheme">
          <Icon :name="colorMode.value === 'dark' ? 'lucide:sun' : 'lucide:moon'" />
        </button>
        <div ref="walletControl" class="wallet-control">
          <button
            class="wallet-button cup-wallet"
            type="button"
            :aria-expanded="connected ? walletMenuOpen : undefined"
            :aria-haspopup="connected ? 'menu' : 'dialog'"
            @click="toggleWallet"
          >
            <Icon name="lucide:wallet-cards" />{{ walletLabel }}
            <Icon v-if="connected" name="lucide:chevron-down" class="wallet-chevron" :class="{ open: walletMenuOpen }" />
          </button>
          <Transition name="dropdown-pop">
            <div v-if="connected && walletMenuOpen" class="wallet-dropdown" role="menu">
              <div class="wallet-dropdown-account">
                <span><i /> CONNECTED WITH {{ walletName.toUpperCase() }}</span>
                <strong>{{ walletAddress.slice(0, 7) }}…{{ walletAddress.slice(-7) }}</strong>
              </div>
              <NuxtLink to="/portfolio" role="menuitem">
                <Icon name="lucide:chart-pie" /> View portfolio
              </NuxtLink>
              <button type="button" role="menuitem" class="wallet-logout" @click="logoutWallet">
                <Icon name="lucide:log-out" /> Disconnect
              </button>
            </div>
          </Transition>
        </div>
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
        <NuxtLink v-if="isTestMode" to="/management">Management</NuxtLink>
        <NuxtLink to="/settings">Settings</NuxtLink>
      </nav>
    </Transition>

    <NuxtPage />

    <footer class="cup-footer">
      <div>
        <NuxtLink class="cup-brand" to="/" aria-label="PurpleX home">
          <img class="cup-brand-logo cup-brand-logo-light" src="/logo-light.png" alt="PurpleX">
          <img class="cup-brand-logo cup-brand-logo-dark" src="/logo-dark.png" alt="">
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
          <p>{{ isTestMode ? 'Choose a wallet as your demo identity. Test Mode never requests a signature or sends an on-chain transaction.' : 'Choose a wallet to preview and submit trades on-chain.' }}</p>
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
