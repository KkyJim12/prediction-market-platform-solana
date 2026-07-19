<script setup lang="ts">
const { connected, walletAddress } = useSolanaWallet()
const { isTestMode, setMode } = useAppMode()
const { markets, loadingMarkets, marketsError, loadMarkets } = useTestPredictionMarket()
const saving = ref(false)
const resolving = ref('')
const message = ref('')
const errorMessage = ref('')

const defaultClose = () => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}
const form = reactive({
  fixtureId: '',
  competition: 'Hackathon Demo',
  home: '',
  away: '',
  homeOdds: '2.10',
  drawOdds: '3.20',
  awayOdds: '2.80',
  bettingClosesAt: defaultClose()
})

function openWallet() {
  document.querySelector<HTMLButtonElement>('.cup-wallet')?.click()
}

function oddsBaseUnits(value: string) {
  const odds = Number(value)
  return Number.isFinite(odds) ? Math.round(odds * 10_000) : 0
}

async function createMarket() {
  if (!connected.value || saving.value) return
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await $fetch('/api/test/markets', {
      method: 'POST',
      body: {
        wallet: walletAddress.value,
        fixtureId: form.fixtureId.trim(),
        competition: form.competition,
        home: form.home,
        away: form.away,
        homeOdds: oddsBaseUnits(form.homeOdds),
        drawOdds: oddsBaseUnits(form.drawOdds),
        awayOdds: oddsBaseUnits(form.awayOdds),
        bettingClosesAt: new Date(form.bettingClosesAt).toISOString()
      }
    })
    message.value = 'Test market created in PostgreSQL.'
    form.fixtureId = ''
    form.home = ''
    form.away = ''
    await loadMarkets()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Could not create the test market.'
  } finally {
    saving.value = false
  }
}

async function resolveMarket(id: string, result?: number) {
  if (!connected.value || resolving.value) return
  resolving.value = id
  message.value = ''
  errorMessage.value = ''
  try {
    await $fetch(`/api/test/markets/${id}/resolve`, {
      method: 'POST',
      body: { wallet: walletAddress.value, result, voided: result === undefined }
    })
    message.value = result === undefined ? 'Market voided and stakes returned.' : 'Market resolved and all positions settled.'
    await loadMarkets()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Could not resolve the test market.'
  } finally {
    resolving.value = ''
  }
}

onMounted(() => {
  if (isTestMode.value) loadMarkets()
})

useSeoMeta({
  title: 'Test Market Management — PurpleX',
  description: 'Create, price, and resolve PostgreSQL-backed hackathon demo markets.'
})
</script>

<template>
  <main class="management-page">
    <section class="management-hero">
      <div>
        <span class="cup-kicker"><Icon name="lucide:database" /> TEST MODE MANAGEMENT</span>
        <h1>Run the whole demo.</h1>
        <p>Create a market, choose its decimal odds, accept database bets, then publish the result and settle every position atomically.</p>
      </div>
      <div class="management-safety"><Icon name="lucide:shield-check" /><div><strong>Zero on-chain transactions</strong><span>Your public key is an account ID only. No message or transaction is signed.</span></div></div>
    </section>

    <section v-if="!isTestMode" class="management-gate">
      <Icon name="lucide:toggle-right" />
      <h2>Management is available in Test Mode</h2>
      <p>Switch modes to manage the isolated <code>test_*</code> tables.</p>
      <button type="button" class="cup-primary" @click="setMode('test')">Enter Test Mode</button>
    </section>

    <section v-else class="management-content">
      <div v-if="!connected" class="management-gate">
        <Icon name="lucide:wallet-cards" />
        <h2>Connect any Solana wallet</h2>
        <p>The address identifies your demo account. This does not request a signature.</p>
        <button type="button" class="cup-primary" @click="openWallet">Connect wallet</button>
      </div>

      <template v-else>
        <section class="management-form">
          <header><div><span>NEW TEST MARKET</span><h2>Market and odds</h2></div><b>CREATOR {{ walletAddress.slice(0, 5) }}…{{ walletAddress.slice(-5) }}</b></header>
          <div class="management-fields">
            <label><span>FIXTURE ID</span><input v-model="form.fixtureId" placeholder="demo-final-01"></label>
            <label><span>COMPETITION</span><input v-model="form.competition"></label>
            <label><span>HOME TEAM</span><input v-model="form.home" placeholder="Argentina"></label>
            <label><span>AWAY TEAM</span><input v-model="form.away" placeholder="France"></label>
            <label><span>HOME ODDS</span><input v-model="form.homeOdds" inputmode="decimal"></label>
            <label><span>DRAW ODDS</span><input v-model="form.drawOdds" inputmode="decimal"></label>
            <label><span>AWAY ODDS</span><input v-model="form.awayOdds" inputmode="decimal"></label>
            <label><span>BETTING CLOSES</span><input v-model="form.bettingClosesAt" type="datetime-local"></label>
          </div>
          <button class="management-submit" type="button" :disabled="saving" @click="createMarket"><Icon name="lucide:plus" /> {{ saving ? 'Creating…' : 'Create database market' }}</button>
        </section>

        <div v-if="message" class="management-message success"><Icon name="lucide:circle-check" />{{ message }}</div>
        <div v-if="errorMessage" class="management-message error"><Icon name="lucide:circle-alert" />{{ errorMessage }}</div>

        <section class="management-list">
          <header><div><span>TEST MARKETS</span><h2>Publish a result</h2></div><button type="button" @click="loadMarkets"><Icon name="lucide:refresh-cw" /> Refresh</button></header>
          <article v-for="market in markets" :key="market.id">
            <div class="management-market-name">
              <span>{{ market.competition }} · {{ market.fixtureId }}</span>
              <h3>{{ market.home }} <i>vs</i> {{ market.away }}</h3>
              <small>{{ market.totalStaked.toFixed(2) }} USDC staked · {{ market.status.toUpperCase() }}</small>
            </div>
            <div v-if="market.status === 'open'" class="management-results">
              <button type="button" :disabled="resolving === market.id" @click="resolveMarket(market.id, 0)">{{ market.home }} wins</button>
              <button type="button" :disabled="resolving === market.id" @click="resolveMarket(market.id, 1)">Draw</button>
              <button type="button" :disabled="resolving === market.id" @click="resolveMarket(market.id, 2)">{{ market.away }} wins</button>
              <button class="void" type="button" :disabled="resolving === market.id" @click="resolveMarket(market.id)">Void</button>
            </div>
            <strong v-else>{{ market.status === 'voided' ? 'VOIDED' : `WINNER: ${[market.home, 'Draw', market.away][market.result ?? 0]}` }}</strong>
          </article>
          <div v-if="!markets.length" class="management-empty">{{ loadingMarkets ? 'Loading…' : marketsError || 'No test markets created yet.' }}</div>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
.management-page{min-height:70vh}.management-hero{display:flex;justify-content:space-between;gap:40px;padding:72px max(5vw,24px);background:linear-gradient(135deg,var(--surface),var(--accent-soft))}.management-hero h1{font-size:clamp(40px,6vw,78px);margin:12px 0}.management-hero p{max-width:700px;color:var(--muted);font-size:17px}.management-safety{align-self:center;display:flex;gap:13px;max-width:360px;padding:20px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}.management-safety svg{color:var(--accent);font-size:26px}.management-safety div{display:grid;gap:5px}.management-safety span{color:var(--muted);font-size:12px;line-height:1.5}.management-content{padding:46px max(5vw,24px);display:grid;gap:24px}.management-gate{margin:70px auto;padding:40px;text-align:center;max-width:620px;border:1px solid var(--line);border-radius:20px;background:var(--surface)}.management-gate>svg{font-size:38px;color:var(--accent)}.management-form,.management-list{padding:24px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}.management-form header,.management-list>header,.management-list article{display:flex;align-items:center;justify-content:space-between;gap:20px}.management-form header span,.management-list header span,.management-fields label span{font-size:9px;letter-spacing:.12em;font-weight:900;color:var(--accent)}.management-form h2,.management-list h2{margin:5px 0}.management-form header b{font-size:10px;color:var(--muted)}.management-fields{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:24px 0}.management-fields label{display:grid;gap:7px}.management-fields input{min-width:0;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);color:var(--text)}.management-submit{padding:13px 18px;border:0;border-radius:10px;background:var(--accent);color:white;font-weight:900}.management-message{display:flex;align-items:center;gap:8px;padding:13px;border-radius:10px}.management-message.success{background:#22c55e18;color:#22c55e}.management-message.error{background:#ef444418;color:#ef4444}.management-list>header>button{border:1px solid var(--line);border-radius:9px;padding:9px;background:var(--surface-2);color:var(--text)}.management-list article{padding:18px 0;border-top:1px solid var(--line)}.management-market-name span,.management-market-name small{font-size:10px;color:var(--muted)}.management-market-name h3{margin:6px 0}.management-market-name i{font-style:normal;color:var(--muted);font-size:11px}.management-results{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px}.management-results button{padding:9px 11px;border:1px solid var(--accent);border-radius:8px;background:var(--accent-soft);color:var(--text);font-size:11px;font-weight:800}.management-results .void{border-color:var(--line);background:var(--surface-2)}.management-empty{text-align:center;color:var(--muted);padding:35px}
@media(max-width:850px){.management-hero{display:block}.management-safety{margin-top:25px}.management-fields{grid-template-columns:repeat(2,1fr)}.management-list article{align-items:flex-start;flex-direction:column}.management-results{justify-content:flex-start}}@media(max-width:520px){.management-fields{grid-template-columns:1fr}}
</style>
