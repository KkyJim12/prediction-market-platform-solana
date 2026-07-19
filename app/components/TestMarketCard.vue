<script setup lang="ts">
import type { TestMarket } from '~/composables/useTestPredictionMarket'

const props = defineProps<{ market: TestMarket }>()
const emit = defineEmits<{ placed: [] }>()
const { connected } = useSolanaWallet()
const { placeBet } = useTestPredictionMarket()
const selected = ref<number | null>(null)
const stake = ref('10')
const submitting = ref(false)
const errorMessage = ref('')
const reference = ref('')

const labels = computed(() => [props.market.home, 'Draw', props.market.away])
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
const payout = computed(() => selected.value === null
  ? 0
  : Number(stake.value || 0) * props.market.odds[selected.value]!
)

function openWallet() {
  document.querySelector<HTMLButtonElement>('.cup-wallet')?.click()
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
        @click="selected = index"
      >
        <span>{{ label }}</span><strong>{{ market.odds[index]?.toFixed(2) }}</strong>
      </button>
    </div>
    <div v-if="selected !== null" class="test-market-ticket">
      <label>
        <span>STAKE · MIN 1 USDC</span>
        <div><input v-model="stake" inputmode="decimal" aria-label="Test stake"><b>USDC</b></div>
      </label>
      <p>Demo return <strong>{{ Number.isFinite(payout) ? payout.toFixed(2) : '0.00' }} USDC</strong></p>
      <button v-if="!connected" class="test-market-submit" type="button" @click="openWallet">
        <Icon name="lucide:wallet-cards" /> Connect wallet
      </button>
      <button v-else class="test-market-submit" type="button" :disabled="parsedStake < 1_000_000n || submitting" @click="submit">
        <Icon :name="submitting ? 'lucide:loader-circle' : 'lucide:database'" />
        {{ submitting ? 'Saving…' : 'Place database bet' }}
      </button>
      <small><Icon name="lucide:shield-check" /> No signature, wallet popup, or on-chain transaction.</small>
      <p v-if="errorMessage" class="trade-bet-error">{{ errorMessage }}</p>
      <p v-if="reference" class="test-market-success"><Icon name="lucide:circle-check" /> Saved as {{ reference }}</p>
    </div>
    <footer>
      <span>{{ market.totalStaked.toFixed(2) }} USDC test volume</span>
      <span v-if="market.status === 'resolved'">Result: {{ labels[market.result ?? 0] }}</span>
    </footer>
  </article>
</template>

<style scoped>
.test-market-card{border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:20px;box-shadow:var(--shadow-sm)}
.test-market-card header,.test-market-card footer,.test-market-matchup,.test-market-close,.test-market-ticket p{display:flex;align-items:center;justify-content:space-between;gap:12px}
.test-market-card header div{display:grid;gap:4px}.test-market-card header span{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}.test-market-card header small,.test-market-close,.test-market-card footer{color:var(--muted);font-size:11px}.test-market-card header>b{font-size:9px;letter-spacing:.1em;padding:6px 9px;border-radius:999px;background:var(--surface-2)}.test-market-card header>b.open{color:#22c55e}
.test-market-matchup{margin:20px 0 10px}.test-market-matchup h3{font-size:18px;margin:0;flex:1}.test-market-matchup h3:last-child{text-align:right}.test-market-matchup>span{font-size:9px;font-weight:900;color:var(--muted)}
.test-market-close{justify-content:flex-start!important}
.test-market-outcomes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}.test-market-outcomes button{display:grid;gap:6px;padding:12px 8px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);color:var(--text);cursor:pointer}.test-market-outcomes button.active{border-color:var(--accent);background:var(--accent-soft)}.test-market-outcomes span{font-size:10px;overflow:hidden;text-overflow:ellipsis}.test-market-outcomes strong{font-size:18px;color:var(--accent)}
.test-market-ticket{padding:14px;border-radius:13px;background:var(--surface-2)}.test-market-ticket label>span{font-size:9px;font-weight:900;color:var(--muted)}.test-market-ticket label>div{display:flex;align-items:center;margin-top:7px;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:0 11px}.test-market-ticket input{width:100%;border:0;outline:0;background:transparent;color:var(--text);font:800 20px/1.2 inherit;padding:11px 0}.test-market-ticket p{font-size:12px}.test-market-submit{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:10px;padding:12px;background:var(--accent);color:white;font-weight:900;cursor:pointer}.test-market-submit:disabled{opacity:.5;cursor:not-allowed}.test-market-ticket>small{display:flex;gap:6px;align-items:center;margin-top:10px;color:var(--muted)}.test-market-success{color:#22c55e!important;justify-content:flex-start!important;word-break:break-all}.test-market-card footer{margin-top:16px;padding-top:13px;border-top:1px solid var(--line)}
</style>
