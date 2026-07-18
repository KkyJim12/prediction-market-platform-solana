<script setup lang="ts">
const {
  updatedAt,
  txOddsConfigured,
  txOddsLive,
  status,
  refresh
} = useTxOdds()

const activationComplete = ref(false)

function openWallet() {
  if (!import.meta.client) return
  document.querySelector<HTMLButtonElement>('.cup-wallet')?.click()
}

async function handleActivated() {
  activationComplete.value = true
  await refresh()
}

useSeoMeta({
  title: 'Settings — CupMarket',
  description: 'Configure Solana and activate the TxODDS TxLINE World Cup data feed.'
})
</script>

<template>
  <main class="settings-page">
    <section class="settings-hero">
      <div>
        <span class="cup-kicker"><Icon name="lucide:settings-2" /> PLATFORM SETTINGS</span>
        <h1>Settings.</h1>
        <p>Manage the Solana wallet connection and activate server access to the TxLINE World Cup data feed.</p>
      </div>

      <div class="settings-feed-state">
        <span>TXLINE FEED</span>
        <strong :class="{ online: txOddsLive }">
          <i />{{ txOddsLive ? 'ONLINE' : txOddsConfigured ? 'CONFIGURED' : 'NOT ACTIVATED' }}
        </strong>
        <small v-if="updatedAt">Last synced {{ new Date(updatedAt).toLocaleString() }}</small>
        <small v-else>World Cup free-tier access</small>
      </div>
    </section>

    <section class="settings-content">
      <div class="settings-section-heading">
        <div>
          <span>DATA PROVIDER</span>
          <h2>TxLINE API access</h2>
        </div>
        <NuxtLink to="/matches">Back to markets <Icon name="lucide:arrow-up-right" /></NuxtLink>
      </div>

      <TxOddsActivationPanel
        v-if="!txOddsConfigured || activationComplete"
        @connect-wallet="openWallet"
        @activated="handleActivated"
      />

      <section v-else class="settings-connected-card">
        <div class="settings-connected-icon"><Icon name="lucide:shield-check" /></div>
        <div>
          <span>SERVER CREDENTIAL</span>
          <h3>TxLINE API token configured</h3>
          <p>The token is loaded server-side and the match feed is ready. Secrets are never included in frontend runtime configuration.</p>
        </div>
        <button type="button" :disabled="status === 'pending'" @click="refresh()">
          <Icon :name="status === 'pending' ? 'lucide:loader-circle' : 'lucide:refresh-cw'" />
          {{ status === 'pending' ? 'Checking feed' : 'Check connection' }}
        </button>
      </section>

      <div class="settings-notes">
        <article>
          <Icon name="lucide:wallet-cards" />
          <div><strong>Non-custodial</strong><p>Subscription and activation messages are signed in your wallet. CupMarket never receives your private key.</p></div>
        </article>
        <article>
          <Icon name="lucide:server-cog" />
          <div><strong>Server-side credentials</strong><p>Copy an activated token into <code>NUXT_TX_ODDS_API_TOKEN</code> to preserve it across server restarts.</p></div>
        </article>
      </div>
    </section>
  </main>
</template>
