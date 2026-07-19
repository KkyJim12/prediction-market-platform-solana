<script setup lang="ts">
import type { LiveFixture } from '~/composables/useTxOdds'
import type { MarketOutcome } from '~/composables/useMarketOdds'

const props = defineProps<{ fixture: LiveFixture }>()
const tradeOpen = ref(false)
const selectedKey = ref<MarketOutcome['key']>()
const amount = ref('25')
const submitted = ref(false)
const betError = ref('')
const submitting = ref(false)
const transactionSignature = ref('')
const { connected, walletAddress } = useSolanaWallet()
const {
  cluster,
  programId,
  fetchMarket,
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
const onChainLoading = ref(false)

const home = computed(() => props.fixture.participant1IsHome ? props.fixture.participant1 : props.fixture.participant2)
const away = computed(() => props.fixture.participant1IsHome ? props.fixture.participant2 : props.fixture.participant1)
const stake = computed(() => Math.max(0, Number(amount.value) || 0))
const displayOutcomes = computed<MarketOutcome[]>(() => {
  if (
    !onChainMarket.value ||
    onChainMarket.value.status !== 'open' ||
    onChainMarket.value.bettingClosesAt <= BigInt(Math.floor(Date.now() / 1000))
  ) {
    return outcomes.value.map(outcome => ({ ...outcome, price: null }))
  }
  return outcomes.value.map((outcome, index) => ({
    ...outcome,
    price: Number(onChainMarket.value!.odds[index]) / 10_000
  }))
})
const selected = computed(() => displayOutcomes.value.find(outcome => outcome.key === selectedKey.value))
const quote = computed(() => {
  const decimalOdds = selected.value?.price ?? 0
  if (decimalOdds <= 1 || !stake.value) return null

  return {
    decimalOdds,
    payout: stake.value * decimalOdds,
    profit: stake.value * (decimalOdds - 1)
  }
})

function formatOdds(value: number | null) {
  return value && value > 1 ? value.toFixed(2) : '—'
}

function openTrade(outcome: MarketOutcome) {
  if (!outcome.price || outcome.price <= 1) return
  selectedKey.value = outcome.key
  submitted.value = false
  betError.value = ''
  tradeOpen.value = true
}

async function loadOnChainMarket() {
  onChainLoading.value = true
  betError.value = ''
  try {
    onChainMarket.value = await fetchMarket(props.fixture.fixtureId)
  } catch (error: any) {
    betError.value = error?.data?.statusMessage || error?.message || 'Could not read this on-chain market.'
  } finally {
    onChainLoading.value = false
  }
}

function openWallet() {
  tradeOpen.value = false
  if (!import.meta.client) return
  document.querySelector<HTMLButtonElement>('.cup-wallet')?.click()
}

async function placeOnChainBet() {
  if (!quote.value || !selected.value || !connected.value || !import.meta.client) return
  submitting.value = true
  betError.value = ''
  const betsKey = `cupmarket-demo-bets:${walletAddress.value}`
  try {
    const outcome = selectedKey.value === 'home' ? 0 : selectedKey.value === 'draw' ? 1 : 2
    const result = await placeBet(props.fixture.fixtureId, outcome, parseMockUsdc(amount.value))
    transactionSignature.value = result.signature
    let bets: Record<string, unknown>[] = []
    const saved = JSON.parse(localStorage.getItem(betsKey) || '[]')
    bets = Array.isArray(saved) ? saved : []
    bets.unshift({
      id: result.positionIdHex,
      betAddress: result.betAddress,
      signature: result.signature,
      fixtureId: props.fixture.fixtureId,
      competition: props.fixture.competition,
      home: home.value,
      away: away.value,
      selection: selected.value.label,
      selectionKey: selected.value.key,
      odds: Number(result.expectedOdds) / 10_000,
      stake: stake.value,
      potentialPayout: Number(result.payout) / 1_000_000,
      potentialProfit: Number(result.payout) / 1_000_000 - stake.value,
      placedAt: new Date().toISOString(),
      status: 'open'
    })
    localStorage.setItem(betsKey, JSON.stringify(bets))
    submitted.value = true
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
      <span>{{ primaryMarket?.market || '1X2 MATCH RESULT' }} · {{ cluster.toUpperCase() }}</span>
    </div>

    <div class="outcome-buttons">
      <button
        v-for="outcome in displayOutcomes"
        :key="outcome.key"
        type="button"
        :disabled="!outcome.price || outcome.price <= 1"
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
      <span v-else>Fixed-odds payout</span>
    </footer>

    <Teleport to="body">
      <Transition name="modal-slide">
        <div v-if="tradeOpen" class="modal-backdrop trade-backdrop" @click.self="tradeOpen = false">
          <section class="trade-ticket" role="dialog" aria-modal="true" aria-labelledby="trade-title">
            <button class="modal-close" type="button" title="Close" @click="tradeOpen = false"><Icon name="lucide:x" /></button>
            <div class="trade-ticket-label">FIXED-ODDS BET · FIXTURE {{ fixture.fixtureId }}</div>
            <h2 id="trade-title">{{ home }} vs {{ away }}</h2>
            <p>Back <strong>{{ selected?.label }}</strong> to win</p>

            <div class="trade-side">
              <span>LIVE DECIMAL ODDS</span>
              <strong>{{ formatOdds(selected?.price ?? null) }}</strong>
              <small>{{ selected?.probability?.toFixed(1) ?? '—' }}% implied probability</small>
            </div>

            <label class="trade-amount">
              <span>STAKE</span>
              <div><input v-model="amount" type="number" min="0" step="any" inputmode="decimal" aria-label="Bet amount"><strong>mock USDC</strong></div>
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
            <small class="trade-disclaimer">Review: {{ stake.toFixed(2) }} mock USDC on {{ selected?.label || 'selected outcome' }} at locked on-chain odds; potential payout {{ quote?.payout.toFixed(2) || '—' }}; fee payer {{ walletAddress || 'connected wallet' }}; cluster {{ cluster }}; program {{ programId }}. The transaction is simulated before signing. TxLINE is reference data; the oracle-published account is authoritative.</small>
          </section>
        </div>
      </Transition>
    </Teleport>
  </article>
</template>
