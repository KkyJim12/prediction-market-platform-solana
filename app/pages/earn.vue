<script setup lang="ts">
const { connected, walletAddress } = useSolanaWallet()

const amount = ref(100)
const poolReturn = ref(5)
const action = ref<'deposit' | 'withdraw'>('deposit')

const validAmount = computed(() =>
  Number.isFinite(amount.value) && amount.value > 0
    ? amount.value
    : 0
)

const scenarioPnl = computed(() => validAmount.value * poolReturn.value / 100)
const scenarioValue = computed(() => validAmount.value + scenarioPnl.value)

const usdc = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

function formatUsdc(value: number) {
  return usdc.format(value)
}

function openWallet() {
  if (!import.meta.client) return
  document.querySelector<HTMLButtonElement>('.cup-wallet')?.click()
}

useSeoMeta({
  title: 'Earn — CupMarket',
  description: 'Preview supplying USDC to the CupMarket counterparty liquidity pool.'
})
</script>

<template>
  <main class="earn-page">
    <section class="earn-hero">
      <div>
        <span class="cup-kicker"><Icon name="lucide:landmark" /> COUNTERPARTY LIQUIDITY</span>
        <h1>Earn from the other side.</h1>
        <p>Supply USDC to back prediction-market trades. When traders lose, the pool gains. When traders win, the pool pays their profit and liquidity providers absorb the loss pro rata.</p>
        <div class="earn-hero-tags">
          <span><Icon name="lucide:circle-dollar-sign" /> USDC vault</span>
          <span><Icon name="lucide:scale" /> Pro-rata P&amp;L</span>
          <span><Icon name="lucide:shield-alert" /> Principal at risk</span>
        </div>
      </div>

      <div class="earn-model-badge">
        <span>POOL STATUS</span>
        <strong><i /> CONTRACT REQUIRED</strong>
        <p>Interface preview only. No vault or pool program is deployed in this repository.</p>
      </div>
    </section>

    <section class="earn-content">
      <div class="earn-metrics">
        <div><span>POOL TVL</span><strong>—</strong><small>On-chain vault not connected</small></div>
        <div><span>SHARE PRICE</span><strong>—</strong><small>Requires pool accounting</small></div>
        <div><span>UTILIZATION</span><strong>—</strong><small>Requires open exposure</small></div>
        <div><span>YOUR POSITION</span><strong>{{ connected ? '0.00' : '—' }}</strong><small>USDC</small></div>
      </div>

      <div class="earn-main-grid">
        <section class="earn-explainer">
          <div class="earn-section-label">HOW THE POOL WORKS</div>
          <h2>Liquidity providers become the market counterparty.</h2>

          <div class="earn-flow">
            <article>
              <b>01</b>
              <Icon name="lucide:wallet-minimal" />
              <div><h3>Supply USDC</h3><p>Your deposit receives vault shares representing a pro-rata claim on pool assets.</p></div>
            </article>
            <article>
              <b>02</b>
              <Icon name="lucide:repeat-2" />
              <div><h3>Back market exposure</h3><p>The pool provides collateral against trader positions subject to utilization and exposure limits.</p></div>
            </article>
            <article>
              <b>03</b>
              <Icon name="lucide:scale" />
              <div><h3>Settle wins and losses</h3><p>Trader losses increase pool assets; trader profits and settlement costs reduce them.</p></div>
            </article>
          </div>

          <div class="earn-outcome-grid">
            <div class="pool-wins">
              <span>TRADER LOSES</span>
              <Icon name="lucide:trending-up" />
              <strong>Pool gains</strong>
              <p>Lost trader collateral remains in the pool and raises the value of each vault share.</p>
            </div>
            <div class="pool-loses">
              <span>TRADER WINS</span>
              <Icon name="lucide:trending-down" />
              <strong>Pool pays</strong>
              <p>Winning payouts come from pool collateral and lower the value of each vault share.</p>
            </div>
          </div>
        </section>

        <aside class="earn-ticket">
          <div class="earn-ticket-head">
            <div>
              <span>USDC COUNTERPARTY POOL</span>
              <h2>Liquidity quote</h2>
            </div>
            <span class="preview-pill">PREVIEW</span>
          </div>

          <div class="earn-action-tabs">
            <button type="button" :class="{ active: action === 'deposit' }" @click="action = 'deposit'">Deposit</button>
            <button type="button" :class="{ active: action === 'withdraw' }" @click="action = 'withdraw'">Withdraw</button>
          </div>

          <label class="earn-amount">
            <span>{{ action === 'deposit' ? 'AMOUNT TO SUPPLY' : 'SHARES TO REDEEM' }}</span>
            <div>
              <input v-model.number="amount" type="number" min="0" step="1" inputmode="decimal" aria-label="USDC amount">
              <strong>USDC</strong>
            </div>
          </label>

          <div class="earn-quick-amounts">
            <button v-for="value in [100, 500, 1000, 5000]" :key="value" type="button" @click="amount = value">{{ value.toLocaleString() }}</button>
          </div>

          <div class="earn-scenario">
            <div>
              <span>POOL RETURN SCENARIO</span>
              <strong :class="{ positive: poolReturn >= 0, negative: poolReturn < 0 }">{{ poolReturn > 0 ? '+' : '' }}{{ poolReturn }}%</strong>
            </div>
            <input v-model.number="poolReturn" type="range" min="-20" max="20" step="1" aria-label="Pool return scenario">
            <small>Illustrative scenario, not an APY or return forecast.</small>
          </div>

          <div class="earn-quote-rows">
            <div><span>Starting position</span><strong>{{ formatUsdc(validAmount) }} USDC</strong></div>
            <div><span>Scenario P&amp;L</span><strong :class="{ positive: scenarioPnl >= 0, negative: scenarioPnl < 0 }">{{ scenarioPnl >= 0 ? '+' : '' }}{{ formatUsdc(scenarioPnl) }} USDC</strong></div>
            <div class="earn-quote-total"><span>Scenario value</span><strong>{{ formatUsdc(scenarioValue) }} USDC</strong></div>
          </div>

          <button v-if="!connected" class="earn-submit" type="button" @click="openWallet">
            <Icon name="lucide:wallet-cards" /> Connect wallet
          </button>
          <button v-else class="earn-submit" type="button" disabled>
            <Icon name="lucide:construction" /> Pool program not connected
          </button>

          <div v-if="connected" class="earn-wallet-row">
            <span>CONNECTED WALLET</span>
            <strong>{{ walletAddress.slice(0, 5) }}…{{ walletAddress.slice(-5) }}</strong>
          </div>

          <p class="earn-risk"><Icon name="lucide:triangle-alert" /> Liquidity provision is not yield-guaranteed. Pool losses can reduce principal, and withdrawals may be delayed while collateral backs open markets.</p>
        </aside>
      </div>
    </section>
  </main>
</template>
