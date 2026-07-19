<script setup lang="ts">
import type { TestMarket } from '~/composables/useTestPredictionMarket'

const props = defineProps<{ market: TestMarket }>()
const emit = defineEmits<{ placed: [] }>()
const { connected } = useSolanaWallet()
const { placeBet } = useTestPredictionMarket()
const selected = ref<number | null>(null)
const tradeOpen = ref(false)
const stake = ref('10')
const submitting = ref(false)
const errorMessage = ref('')
const reference = ref('')
const amountInput = ref<HTMLInputElement>()

const labels = computed(() => [props.market.home, 'Draw', props.market.away])
const selectedLabel = computed(() => selected.value === null ? '' : labels.value[selected.value] || '')
const selectedOdds = computed(() => selected.value === null ? 0 : props.market.odds[selected.value] || 0)
const numericStake = computed(() => Math.max(0, Number(stake.value) || 0))
const tradeTitleId = computed(() => `test-trade-title-${props.market.id}`)
const parsedStake = computed(() => {
  try {
    return parseMockUsdc(stake.value)
  } catch {
    return 0n
  }
})
const open = computed(() =>
  props.market.status === 'open' && new Date(props.market.bettingClosesAt).getTime() > Date.now()
)
const payout = computed(() => numericStake.value * selectedOdds.value)
const profit = computed(() => Math.max(0, payout.value - numericStake.value))

function openWallet() {
  tradeOpen.value = false
  document.querySelector<HTMLButtonElement>('.cup-wallet')?.click()
}

async function openTrade(index: number) {
  if (!open.value) return
  selected.value = index
  errorMessage.value = ''
  reference.value = ''
  tradeOpen.value = true
  await nextTick()
  amountInput.value?.focus()
}

async function submit() {
  if (selected.value === null || parsedStake.value < 1_000_000n || submitting.value) return
  submitting.value = true
  errorMessage.value = ''
  reference.value = ''
  try {
    reference.value = await placeBet(props.market.id, selected.value, parsedStake.value)
    emit('placed')
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Could not save the test position.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <article class="test-market-card">
    <header>
      <div><span>{{ market.competition }}</span><small>{{ market.fixtureId }}</small></div>
      <b :class="market.status">{{ open ? 'OPEN' : market.status.toUpperCase() }}</b>
    </header>
    <div class="test-market-matchup">
      <h3>{{ market.home }}</h3><span>VS</span><h3>{{ market.away }}</h3>
    </div>
    <p class="test-market-close"><Icon name="lucide:clock-3" /> Closes {{ new Date(market.bettingClosesAt).toLocaleString() }}</p>
    <div class="test-market-outcomes">
      <button
        v-for="(label, index) in labels"
        :key="label"
        type="button"
        :disabled="!open"
        :class="{ active: selected === index }"
        @click="openTrade(index)"
      >
        <span>{{ label }}</span><strong>{{ market.odds[index]?.toFixed(2) }}</strong>
      </button>
    </div>
    <footer>
      <span>{{ market.totalStaked.toFixed(2) }} USDC test volume</span>
      <span v-if="market.status === 'resolved'">Result: {{ labels[market.result ?? 0] }}</span>
    </footer>

    <Teleport to="body">
      <Transition name="modal-slide">
        <div v-if="tradeOpen && selected !== null" class="modal-backdrop trade-backdrop" @click.self="tradeOpen = false" @keydown.esc="tradeOpen = false">
          <section class="trade-ticket" role="dialog" aria-modal="true" :aria-labelledby="tradeTitleId">
            <button class="modal-close" type="button" title="Close" @click="tradeOpen = false"><Icon name="lucide:x" /></button>
            <div class="trade-ticket-label">TEST MODE BET · FIXTURE {{ market.fixtureId }}</div>
            <h2 :id="tradeTitleId">{{ market.home }} vs {{ market.away }}</h2>
            <p>Back <strong>{{ selectedLabel }}</strong> to win</p>

            <div class="trade-side">
              <span>LOCKED DECIMAL ODDS</span>
              <strong>{{ selectedOdds.toFixed(2) }}</strong>
              <small>Fixed for this database bet</small>
            </div>

            <div class="trade-match-details">
              <div><span>Competition</span><strong>{{ market.competition }}</strong></div>
              <div><span>Match</span><strong>{{ market.home }} vs {{ market.away }}</strong></div>
              <div><span>Selection</span><strong>{{ selectedLabel }}</strong></div>
              <div><span>Betting closes</span><strong>{{ new Date(market.bettingClosesAt).toLocaleString() }}</strong></div>
            </div>

            <label class="trade-amount">
              <span>BET AMOUNT · MIN 1 USDC</span>
              <div><input ref="amountInput" v-model="stake" type="number" min="1" step="any" inputmode="decimal" aria-label="Test bet amount"><strong>mock USDC</strong></div>
            </label>
            <div class="quick-amounts cup-quick-amounts">
              <button v-for="value in ['10', '25', '100', '500']" :key="value" type="button" @click="stake = value">{{ value }}</button>
            </div>

            <div class="trade-quote">
              <div><span>Selection</span><strong>{{ selectedLabel }}</strong></div>
              <div><span>Odds</span><strong>{{ selectedOdds.toFixed(2) }}×</strong></div>
              <div><span>Bet amount</span><strong>{{ numericStake.toFixed(2) }} mock USDC</strong></div>
              <div class="trade-payout"><span>Total return if correct</span><strong>{{ payout.toFixed(2) }} mock USDC</strong></div>
              <div><span>Potential profit</span><strong class="positive-text">+{{ profit.toFixed(2) }} mock USDC</strong></div>
            </div>

            <button v-if="!connected" class="cup-primary trade-submit" type="button" @click="openWallet">
              Connect wallet <Icon name="lucide:wallet-cards" />
            </button>
            <button v-else class="cup-primary trade-submit" type="button" :disabled="parsedStake < 1_000_000n || submitting || Boolean(reference)" @click="submit">
              {{ reference ? 'Bet saved' : submitting ? 'Saving…' : 'Place database bet' }}
              <Icon :name="reference ? 'lucide:check' : submitting ? 'lucide:loader-circle' : 'lucide:database'" />
            </button>

            <div v-if="errorMessage" class="trade-bet-error">
              <Icon name="lucide:circle-alert" /><span>{{ errorMessage }}</span>
            </div>
            <div v-if="reference" class="trade-preview-notice">
              <Icon name="lucide:circle-check-big" />
              <span><strong>Database bet saved</strong>{{ reference }}</span>
            </div>
            <small class="trade-disclaimer"><Icon name="lucide:shield-check" /> Test Mode only. No signature, wallet popup, or on-chain transaction is requested.</small>
          </section>
        </div>
      </Transition>
    </Teleport>
  </article>
</template>

<style scoped>
.test-market-card{border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:20px;box-shadow:var(--shadow-sm)}
.test-market-card header,.test-market-card footer,.test-market-matchup,.test-market-close{display:flex;align-items:center;justify-content:space-between;gap:12px}
.test-market-card header div{display:grid;gap:4px}.test-market-card header span{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}.test-market-card header small,.test-market-close,.test-market-card footer{color:var(--muted);font-size:11px}.test-market-card header>b{font-size:9px;letter-spacing:.1em;padding:6px 9px;border-radius:999px;background:var(--surface-2)}.test-market-card header>b.open{color:#22c55e}
.test-market-matchup{margin:20px 0 10px}.test-market-matchup h3{font-size:18px;margin:0;flex:1}.test-market-matchup h3:last-child{text-align:right}.test-market-matchup>span{font-size:9px;font-weight:900;color:var(--muted)}
.test-market-close{justify-content:flex-start!important}
.test-market-outcomes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}.test-market-outcomes button{display:grid;gap:6px;padding:12px 8px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);color:var(--text);cursor:pointer}.test-market-outcomes button.active{border-color:var(--accent);background:var(--accent-soft)}.test-market-outcomes span{font-size:10px;overflow:hidden;text-overflow:ellipsis}.test-market-outcomes strong{font-size:18px;color:var(--accent)}
.test-market-card footer{margin-top:16px;padding-top:13px;border-top:1px solid var(--line)}
</style>
