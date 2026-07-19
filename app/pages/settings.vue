<script setup lang="ts">
const {
  updatedAt,
  txOddsConfigured,
  txOddsLive,
  status,
  refresh
} = useTxOdds()

const activationComplete = ref(false)
const showTokenActivation = ref(false)
const { walletAddress, connected } = useSolanaWallet()
const { isTestMode } = useAppMode()
const {
  cluster,
  programId,
  poolAddress,
  mintAddress,
  fetchPool,
  initializePool,
  explorerTransactionUrl
} = usePredictionMarket()

const pool = ref<Awaited<ReturnType<typeof fetchPool>>>(null)
const poolLoading = ref(true)
const poolSubmitting = ref(false)
const poolError = ref('')
const poolSignature = ref('')
const oracleAddress = ref('')
const minStake = ref('1')
const maxPayout = ref('1000')
const initialLiquidity = ref('10000')
const initializationConfirmed = ref(false)

const canInitialize = computed(() =>
  cluster === 'devnet' &&
  connected.value &&
  !pool.value &&
  !poolLoading.value &&
  !poolSubmitting.value &&
  initializationConfirmed.value &&
  Boolean(oracleAddress.value.trim())
)

function parseAmount(value: string, label: string, allowZero = false) {
  const normalized = value.trim()
  if (!/^\d+(\.\d{0,6})?$/.test(normalized)) {
    throw new Error(`${label} must be a mock USDC amount with no more than 6 decimals.`)
  }
  const [whole, fraction = ''] = normalized.split('.')
  const amount = BigInt(whole!) * 1_000_000n + BigInt((fraction + '000000').slice(0, 6))
  if (allowZero ? amount < 0n : amount <= 0n) throw new Error(`${label} must be greater than zero.`)
  return amount
}

async function refreshPool() {
  poolLoading.value = true
  poolError.value = ''
  try {
    pool.value = await fetchPool()
  } catch (error: any) {
    poolError.value = error?.data?.statusMessage || error?.message || 'Could not read the pool.'
  } finally {
    poolLoading.value = false
  }
}

async function handleInitializePool() {
  poolError.value = ''
  poolSignature.value = ''
  poolSubmitting.value = true
  try {
    const parsedMinStake = parseAmount(minStake.value, 'Minimum stake')
    const parsedMaxPayout = parseAmount(maxPayout.value, 'Maximum payout')
    const parsedLiquidity = parseAmount(initialLiquidity.value, 'Initial liquidity', true)
    if (parsedMaxPayout < parsedMinStake) {
      throw new Error('Maximum payout must be at least the minimum stake.')
    }
    poolSignature.value = await initializePool({
      oracle: oracleAddress.value,
      minStake: parsedMinStake,
      maxPayout: parsedMaxPayout,
      initialLiquidity: parsedLiquidity
    })
    initializationConfirmed.value = false
    await refreshPool()
  } catch (error: any) {
    poolError.value = error?.data?.statusMessage || error?.message || 'Pool initialization failed.'
  } finally {
    poolSubmitting.value = false
  }
}

function openWallet() {
  if (!import.meta.client) return
  document.querySelector<HTMLButtonElement>('.cup-wallet')?.click()
}

async function handleActivated() {
  activationComplete.value = true
  await refresh()
}

function requestNewToken() {
  activationComplete.value = false
  showTokenActivation.value = true
}

watch(walletAddress, (address, previous) => {
  if (!oracleAddress.value || oracleAddress.value === previous) oracleAddress.value = address
  initializationConfirmed.value = false
}, { immediate: true })

onMounted(refreshPool)

useSeoMeta({
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
      <section v-if="isTestMode" class="settings-connected-card">
        <div class="settings-connected-icon"><Icon name="lucide:database" /></div>
        <div>
          <span>TEST MODE</span>
          <h3>All transaction controls are disabled</h3>
          <p>Create markets, set odds, and publish results in the PostgreSQL-backed management workspace. No Test Mode action requests a message or transaction signature.</p>
        </div>
        <div class="settings-connected-actions"><NuxtLink to="/management">Open management</NuxtLink></div>
      </section>

      <template v-else>
      <div class="settings-section-heading">
        <div>
          <span>DATA PROVIDER</span>
          <h2>TxLINE API access</h2>
        </div>
        <NuxtLink to="/matches">Back to markets <Icon name="lucide:arrow-up-right" /></NuxtLink>
      </div>

      <TxOddsActivationPanel
        v-if="!txOddsConfigured || showTokenActivation || activationComplete"
        :replacement="txOddsConfigured"
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
        <div class="settings-connected-actions">
          <button type="button" :disabled="status === 'pending'" @click="refresh()">
            <Icon :name="status === 'pending' ? 'lucide:loader-circle' : 'lucide:refresh-cw'" />
            {{ status === 'pending' ? 'Checking feed' : 'Check connection' }}
          </button>
          <button type="button" class="generate" @click="requestNewToken">
            <Icon name="lucide:key-round" /> Generate new API token
          </button>
        </div>
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

      <div class="settings-section-heading settings-contract-heading">
        <div>
          <span>DEVNET CONTRACT</span>
          <h2>Prediction pool</h2>
        </div>
        <button type="button" class="settings-text-button" :disabled="poolLoading" @click="refreshPool">
          <Icon :name="poolLoading ? 'lucide:loader-circle' : 'lucide:refresh-cw'" />
          Refresh state
        </button>
      </div>

      <section v-if="pool" class="settings-pool-ready">
        <div class="settings-connected-icon"><Icon name="lucide:badge-check" /></div>
        <div>
          <span>POOL INITIALIZED · {{ cluster.toUpperCase() }}</span>
          <h3>On-chain pool is ready</h3>
          <dl>
            <div><dt>Authority</dt><dd>{{ pool.authority }}</dd></div>
            <div><dt>Oracle</dt><dd>{{ pool.oracle }}</dd></div>
            <div><dt>Pool</dt><dd>{{ pool.address }}</dd></div>
          </dl>
          <a v-if="poolSignature" :href="explorerTransactionUrl(poolSignature)" target="_blank" rel="noopener">
            View initialization transaction <Icon name="lucide:arrow-up-right" />
          </a>
        </div>
      </section>

      <section v-else class="settings-pool-initializer">
        <div class="settings-pool-warning">
          <Icon name="lucide:triangle-alert" />
          <div>
            <strong>One-time irreversible setup</strong>
            <p>The connected wallet becomes the pool authority. The current contract lets the first caller claim this role.</p>
          </div>
        </div>

        <div class="settings-pool-fields">
          <label class="settings-wide-field">
            <span>ORACLE ADDRESS</span>
            <input v-model="oracleAddress" type="text" autocomplete="off" spellcheck="false" placeholder="Connect a wallet or enter an oracle address">
          </label>
          <label>
            <span>MINIMUM STAKE</span>
            <div><input v-model="minStake" inputmode="decimal"><small>mock USDC</small></div>
          </label>
          <label>
            <span>MAXIMUM PAYOUT</span>
            <div><input v-model="maxPayout" inputmode="decimal"><small>mock USDC</small></div>
          </label>
          <label>
            <span>INITIAL LIQUIDITY</span>
            <div><input v-model="initialLiquidity" inputmode="decimal"><small>mock USDC</small></div>
          </label>
        </div>

        <div class="settings-transaction-review">
          <span>TRANSACTION REVIEW</span>
          <dl>
            <div><dt>Cluster</dt><dd>{{ cluster }}</dd></div>
            <div><dt>Fee payer / authority</dt><dd>{{ walletAddress || 'Wallet not connected' }}</dd></div>
            <div><dt>Program</dt><dd>{{ programId }}</dd></div>
            <div><dt>Pool</dt><dd>{{ poolAddress }}</dd></div>
            <div><dt>Mock USDC mint</dt><dd>{{ mintAddress }}</dd></div>
          </dl>
        </div>

        <label class="settings-confirm-check">
          <input v-model="initializationConfirmed" type="checkbox">
          <span>I understand that the connected wallet permanently becomes the pool authority.</span>
        </label>

        <div v-if="poolError" class="trade-bet-error"><Icon name="lucide:circle-alert" />{{ poolError }}</div>

        <div class="settings-pool-actions">
          <button v-if="!connected" type="button" @click="openWallet">
            <Icon name="lucide:wallet-cards" /> Connect authority wallet
          </button>
          <button v-else type="button" class="primary" :disabled="!canInitialize" @click="handleInitializePool">
            <Icon :name="poolSubmitting ? 'lucide:loader-circle' : 'lucide:shield-check'" />
            {{ poolSubmitting ? 'Simulating and submitting' : 'Initialize pool on devnet' }}
          </button>
          <small>Simulation runs before your wallet is asked to sign.</small>
        </div>
      </section>
      </template>
    </section>
  </main>
</template>
