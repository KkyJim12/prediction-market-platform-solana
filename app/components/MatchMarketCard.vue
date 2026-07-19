<script setup lang="ts">
import type { LiveFixture } from '~/composables/useTxOdds'
import type { MarketOutcome } from '~/composables/useMarketOdds'

const props = defineProps<{ fixture: LiveFixture }>()
const tradeOpen = ref(false)
const selectedKey = ref<MarketOutcome['key']>()
const amount = ref<string | number>('25')
const submitted = ref(false)
const betError = ref('')
const submitting = ref(false)
const transactionSignature = ref('')
const indexError = ref('')
const { connected, walletAddress } = useSolanaWallet()
const {
  cluster,
  programId,
  fetchPool,
  fetchMarket,
  publishMarket,
  placeBet,
  explorerTransactionUrl
} = usePredictionMarket()
const {
  outcomes,
  primaryMarket,
  status,
  oddsLive,
  oddsError,
  streamState,
  refresh
} = useMarketOdds(() => props.fixture)
const onChainMarket = ref<Awaited<ReturnType<typeof fetchMarket>>>(null)
const predictionPool = ref<Awaited<ReturnType<typeof fetchPool>>>(null)
const onChainLoading = ref(false)
const publishing = ref(false)
const publishSignature = ref('')
const amountInput = ref<HTMLInputElement>()

const home = computed(() => props.fixture.participant1IsHome ? props.fixture.participant1 : props.fixture.participant2)
const away = computed(() => props.fixture.participant1IsHome ? props.fixture.participant2 : props.fixture.participant1)
const tradeTitleId = computed(() => `trade-title-${props.fixture.fixtureId}`)
const stake = computed(() => Math.max(0, Number(amount.value) || 0))
const stakeBaseUnits = computed<bigint | null>(() => {
  try {
    const value = parseMockUsdc(amount.value)
    return value > 0n ? value : null
  } catch {
    return null
  }
})
const marketOpen = computed(() =>
  Boolean(
    onChainMarket.value &&
    onChainMarket.value.status === 'open' &&
    onChainMarket.value.bettingClosesAt > BigInt(Math.floor(Date.now() / 1000)) &&
    props.fixture.startTime > Date.now()
  )
)
const displayOutcomes = computed<MarketOutcome[]>(() => {
  if (!marketOpen.value) return outcomes.value
  return outcomes.value.map((outcome, index) => ({
    ...outcome,
    price: Number(onChainMarket.value!.odds[index]) / 10_000
  }))
})
const selected = computed(() => displayOutcomes.value.find(outcome => outcome.key === selectedKey.value))
const isOracleWallet = computed(() =>
  Boolean(connected.value && predictionPool.value?.oracle === walletAddress.value)
)
const publishableOdds = computed<[bigint, bigint, bigint] | null>(() => {
  const prices = outcomes.value.map(outcome => outcome.price)
  if (prices.some(price => price === null || !Number.isFinite(price) || price! <= 1)) return null
  return prices.map(price => BigInt(Math.round(price! * 10_000))) as [bigint, bigint, bigint]
})
const quote = computed(() => {
  const decimalOdds = selected.value?.price ?? 0
  if (decimalOdds <= 1 || !stakeBaseUnits.value) return null

  return {
    decimalOdds,
    payout: stake.value * decimalOdds,
    profit: stake.value * (decimalOdds - 1)
  }
})

function formatOdds(value: number | null) {
  return value && value > 1 ? value.toFixed(2) : '—'
}

async function openTrade(outcome: MarketOutcome) {
  if (!marketOpen.value || !outcome.price || outcome.price <= 1) return
  selectedKey.value = outcome.key
  submitted.value = false
  betError.value = ''
  indexError.value = ''
  tradeOpen.value = true
  await nextTick()
  amountInput.value?.focus()
}

async function loadOnChainMarket() {
  onChainLoading.value = true
  betError.value = ''
  try {
    const [market, pool] = await Promise.all([
      fetchMarket(props.fixture.fixtureId),
      fetchPool()
    ])
    onChainMarket.value = market
    predictionPool.value = pool
  } catch (error: any) {
    betError.value = error?.data?.statusMessage || error?.message || 'Could not read this on-chain market.'
  } finally {
    onChainLoading.value = false
  }
}

async function publishReferenceOdds() {
  if (!publishableOdds.value || !isOracleWallet.value) return
  publishing.value = true
  betError.value = ''
  publishSignature.value = ''
  try {
    const result = await publishMarket(
      props.fixture.fixtureId,
      publishableOdds.value,
      BigInt(Math.floor(props.fixture.startTime / 1000))
    )
    publishSignature.value = result.signature
    await loadOnChainMarket()
  } catch (error: any) {
    betError.value = error?.data?.statusMessage || error?.message || 'Could not publish this market.'
  } finally {
    publishing.value = false
  }
}

function openWallet() {
  tradeOpen.value = false
  if (!import.meta.client) return
  document.querySelector<HTMLButtonElement>('.cup-wallet')?.click()
}

async function placeOnChainBet() {
  if (!quote.value || !stakeBaseUnits.value || !selected.value || !connected.value || !import.meta.client) return
  submitting.value = true
  betError.value = ''
  indexError.value = ''
  try {
    const outcome = selectedKey.value === 'home' ? 0 : selectedKey.value === 'draw' ? 1 : 2
    const result = await placeBet(props.fixture.fixtureId, outcome, stakeBaseUnits.value)
    transactionSignature.value = result.signature
    submitted.value = true
    try {
      await $fetch('/api/positions', {
        method: 'POST',
        body: {
          signature: result.signature,
          positionId: result.positionIdHex,
          betAddress: result.betAddress,
          fixtureId: props.fixture.fixtureId,
          competition: props.fixture.competition,
          home: home.value,
          away: away.value,
          selection: selected.value.label
        }
      })
    } catch (error: any) {
      indexError.value = error?.data?.statusMessage || error?.message || 'Portfolio indexing is temporarily unavailable.'
    }
    await loadOnChainMarket()
  } catch (error: any) {
    betError.value = error?.data?.statusMessage || error?.message || 'The bet transaction failed.'
  } finally {
    submitting.value = false
  }
}

function formatKickoff(value: number) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

onMounted(loadOnChainMarket)
</script>

<template>
  <article class="amm-market-card">
    <header>
      <div>
        <span class="market-competition"><Icon name="lucide:trophy" />{{ fixture.competition }}</span>
        <span class="market-id">#{{ fixture.fixtureId }}</span>
      </div>
      <time :datetime="new Date(fixture.startTime).toISOString()">{{ formatKickoff(fixture.startTime) }}</time>
    </header>

    <div class="market-matchup">
      <div><span>{{ home.slice(0, 2).toUpperCase() }}</span><strong>{{ home }}</strong><small>HOME</small></div>
      <b>VS</b>
      <div><span>{{ away.slice(0, 2).toUpperCase() }}</span><strong>{{ away }}</strong><small>AWAY</small></div>
    </div>

    <div class="market-source-row">
      <span :class="{ live: onChainMarket?.status === 'open' }">
        <i />{{ onChainLoading ? 'READING SOLANA' : onChainMarket ? `ON-CHAIN ${onChainMarket.status.toUpperCase()}` : 'NOT PUBLISHED ON-CHAIN' }}
      </span>
      <span>{{ primaryMarket?.market || '1X2 MATCH RESULT' }} · {{ marketOpen ? cluster.toUpperCase() : 'TXLINE REFERENCE' }}</span>
    </div>

    <div v-if="!marketOpen && !onChainLoading" class="oracle-publish-row">
      <template v-if="isOracleWallet">
        <div>
          <strong><Icon name="lucide:shield-check" /> ORACLE WALLET</strong>
          <small>Publish {{ displayOutcomes.map(outcome => formatOdds(outcome.price)).join(' / ') }} · closes at kickoff</small>
        </div>
        <button type="button" :disabled="publishing || !publishableOdds" @click="publishReferenceOdds">
          <Icon :name="publishing ? 'lucide:loader-circle' : 'lucide:send'" />
          {{ publishing ? 'Publishing…' : 'Publish odds on-chain' }}
        </button>
      </template>
      <span v-else><Icon name="lucide:lock-keyhole" /> Connect the configured oracle wallet to publish this market.</span>
    </div>

    <div class="outcome-buttons">
      <button
        v-for="outcome in displayOutcomes"
        :key="outcome.key"
        type="button"
        :class="{ reference: !marketOpen }"
        :disabled="!marketOpen || !outcome.price || outcome.price <= 1"
        @click="openTrade(outcome)"
      >
        <span>{{ outcome.shortLabel }}</span>
        <strong>{{ formatOdds(outcome.price) }}</strong>
        <small>{{ outcome.label }}<template v-if="outcome.probability !== null"> · {{ outcome.probability.toFixed(0) }}%</template></small>
      </button>
    </div>

    <footer>
      <span><Icon name="lucide:radio-tower" /> {{ streamState === 'live' ? 'Streaming odds' : 'Latest StablePrice quote' }}</span>
      <button v-if="oddsError" type="button" @click="refresh()"><Icon name="lucide:refresh-cw" /> Retry</button>
      <span v-else>{{ marketOpen ? 'Fixed-odds payout' : 'Reference odds · awaiting oracle publish' }}</span>
    </footer>

    <a
      v-if="publishSignature"
      class="oracle-publish-success"
      :href="explorerTransactionUrl(publishSignature)"
      target="_blank"
      rel="noopener"
    >
      <Icon name="lucide:circle-check-big" /> Market published · view transaction
    </a>

    <Teleport to="body">
      <Transition name="modal-slide">
        <div v-if="tradeOpen" class="modal-backdrop trade-backdrop" @click.self="tradeOpen = false" @keydown.esc="tradeOpen = false">
          <section class="trade-ticket" role="dialog" aria-modal="true" :aria-labelledby="tradeTitleId">
            <button class="modal-close" type="button" title="Close" @click="tradeOpen = false"><Icon name="lucide:x" /></button>
            <div class="trade-ticket-label">FIXED-ODDS BET · FIXTURE {{ fixture.fixtureId }}</div>
            <h2 :id="tradeTitleId">{{ home }} vs {{ away }}</h2>
            <p>Back <strong>{{ selected?.label }}</strong> to win</p>

            <div class="trade-side">
              <span>LIVE DECIMAL ODDS</span>
              <strong>{{ formatOdds(selected?.price ?? null) }}</strong>
              <small>{{ selected?.probability?.toFixed(1) ?? '—' }}% implied probability</small>
            </div>

            <div class="trade-match-details">
              <div><span>Competition</span><strong>{{ fixture.competition }}</strong></div>
              <div><span>Match</span><strong>{{ home }} vs {{ away }}</strong></div>
              <div><span>Kickoff</span><strong>{{ formatKickoff(fixture.startTime) }}</strong></div>
              <div><span>Market</span><strong>{{ primaryMarket?.market || '1X2 match result' }}</strong></div>
            </div>

            <label class="trade-amount">
              <span>BET AMOUNT</span>
              <div><input ref="amountInput" v-model="amount" type="number" min="0" step="any" inputmode="decimal" aria-label="Bet amount"><strong>mock USDC</strong></div>
            </label>
            <div class="quick-amounts cup-quick-amounts">
              <button v-for="value in ['10', '25', '100', '500']" :key="value" type="button" @click="amount = value">{{ value }}</button>
            </div>

            <div class="trade-quote">
              <div><span>Selection</span><strong>{{ selected?.label ?? '—' }}</strong></div>
              <div><span>Odds</span><strong>{{ quote ? `${quote.decimalOdds.toFixed(2)}×` : '—' }}</strong></div>
              <div><span>Stake</span><strong>{{ quote ? `${stake.toFixed(2)} mock USDC` : '—' }}</strong></div>
              <div class="trade-payout"><span>Total return if correct</span><strong>{{ quote ? `${quote.payout.toFixed(2)} mock USDC` : '—' }}</strong></div>
              <div><span>Potential profit</span><strong class="positive-text">{{ quote ? `+${quote.profit.toFixed(2)} mock USDC` : '—' }}</strong></div>
            </div>

            <button v-if="!connected" class="cup-primary trade-submit" type="button" @click="openWallet">
              Connect wallet <Icon name="lucide:wallet-cards" />
            </button>
            <button v-else class="cup-primary trade-submit" type="button" :disabled="!quote || submitted || submitting" @click="placeOnChainBet">
              {{ submitted ? 'Bet confirmed' : submitting ? 'Simulating & submitting…' : 'Place on-chain bet' }} <Icon :name="submitted ? 'lucide:check' : submitting ? 'lucide:loader-circle' : 'lucide:arrow-right'" />
            </button>

            <div v-if="betError" class="trade-bet-error">
              <Icon name="lucide:circle-alert" />
              <span>{{ betError }} <NuxtLink to="/faucet" @click="tradeOpen = false">Open faucet</NuxtLink></span>
            </div>
            <div v-if="submitted" class="trade-preview-notice">
              <Icon name="lucide:circle-check-big" />
              <span>
                <strong>Bet confirmed at {{ quote?.decimalOdds.toFixed(2) }} odds</strong>
                {{ stake.toFixed(2) }} mock USDC was transferred to the pool.
                <a :href="explorerTransactionUrl(transactionSignature)" target="_blank" rel="noopener">View transaction</a>
              </span>
            </div>
            <div v-if="indexError" class="trade-bet-error">
              <Icon name="lucide:database-zap" />
              <span>Bet confirmed on Solana, but portfolio indexing failed: {{ indexError }}</span>
            </div>
            <small class="trade-disclaimer">Review: {{ stake.toFixed(2) }} mock USDC on {{ selected?.label || 'selected outcome' }} at locked on-chain odds; potential payout {{ quote?.payout.toFixed(2) || '—' }}; fee payer {{ walletAddress || 'connected wallet' }}; cluster {{ cluster }}; program {{ programId }}. The transaction is simulated before signing. TxLINE is reference data; the oracle-published account is authoritative.</small>
          </section>
        </div>
      </Transition>
    </Teleport>
  </article>
</template>
