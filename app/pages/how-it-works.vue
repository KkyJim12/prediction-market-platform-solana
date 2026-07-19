<script setup lang="ts">
useSeoMeta({
  title: 'How It Works — PurpleX',
  description: 'Follow a PurpleX prediction from TxODDS TxLINE data through a signed Solana bet, oracle resolution, and on-chain settlement.'
})

const flow = [
  {
    number: '01',
    icon: 'lucide:radio-tower',
    label: 'DATA IN',
    title: 'TxODDS TxLINE sends the match feed',
    copy: 'PurpleX receives covered fixtures, start times, teams, and reference odds through its server-side TxLINE connection. Credentials stay on the server and the browser only receives normalized market data.',
    meta: ['Fixtures', 'Reference odds', 'Match status']
  },
  {
    number: '02',
    icon: 'lucide:bot',
    label: 'MARKET PUBLISHER',
    title: 'The oracle bot publishes executable terms',
    copy: 'The oracle worker maps the TxLINE fixture ID to a deterministic Solana market address, then publishes the betting deadline and executable odds. The on-chain Market account—not the website feed—is the source of truth for a bet.',
    meta: ['Market PDA', 'Closing time', 'On-chain odds']
  },
  {
    number: '03',
    icon: 'lucide:wallet-cards',
    label: 'USER TRANSACTION',
    title: 'The user reviews, signs, and places a bet',
    copy: 'PurpleX reads the current Market account, locks the selected odds, calculates the possible return, and simulates the transaction. After wallet approval, mock USDC moves into the pool vault and the program creates a Bet account for the position.',
    meta: ['Wallet signature', 'Bet PDA', 'Reserved payout']
  },
  {
    number: '04',
    icon: 'lucide:scan-search',
    label: 'RESULT AUTOMATION',
    title: 'The result bot verifies the final score',
    copy: 'After the match is final, the automation worker reconciles the TxLINE result and submits a resolution transaction. The program accepts the outcome only from the configured oracle authority, then closes the market to new bets.',
    meta: ['Final result', 'Oracle signature', 'Resolved market']
  },
  {
    number: '05',
    icon: 'lucide:circle-dollar-sign',
    label: 'ON-CHAIN SETTLEMENT',
    title: 'The program settles every position',
    copy: 'A settlement keeper triggers each open Bet account. The Solana program verifies the stored result and transfers the correct amount from the pool vault. The indexer then mirrors the finalized state in Portfolio and Leaderboard.',
    meta: ['Program checks', 'Token transfer', 'Portfolio sync']
  }
]
</script>

<template>
  <main class="how-page">
    <section class="how-hero">
      <div class="how-hero-copy">
        <span class="cup-kicker"><i /> PROTOCOL WALKTHROUGH</span>
        <h1>From match data<br>to <em>on-chain payout.</em></h1>
        <p>See exactly how TxODDS TxLINE data, the oracle bot, your wallet, and the PurpleX Solana program work together—without giving an off-chain service control of pool funds.</p>
        <div class="how-hero-actions">
          <a href="#system-flow" class="cup-primary">Follow the flow <Icon name="lucide:arrow-down" /></a>
          <NuxtLink to="/matches">Explore markets <Icon name="lucide:arrow-up-right" /></NuxtLink>
        </div>
      </div>

      <div class="how-hero-map" aria-label="System overview">
        <div class="how-map-node source"><Icon name="lucide:radio-tower" /><span>TXLINE</span><small>DATA FEED</small></div>
        <Icon class="how-map-arrow arrow-one" name="lucide:arrow-right" />
        <div class="how-map-node oracle"><Icon name="lucide:bot" /><span>ORACLE</span><small>AUTOMATION</small></div>
        <Icon class="how-map-arrow arrow-two" name="lucide:arrow-right" />
        <div class="how-map-node chain"><Icon name="lucide:blocks" /><span>SOLANA</span><small>PROGRAM</small></div>
        <div class="how-map-node wallet"><Icon name="lucide:wallet-cards" /><span>USER</span><small>SIGNED TX</small></div>
        <Icon class="how-map-arrow arrow-user" name="lucide:arrow-up" />
        <div class="how-map-pulse"><span /><span /><span /></div>
      </div>
    </section>

    <section class="how-rail">
      <div><Icon name="lucide:database-zap" /><span>TxLINE supplies data</span></div>
      <div><Icon name="lucide:key-round" /><span>Oracle authorizes results</span></div>
      <div><Icon name="lucide:shield-check" /><span>Solana controls funds</span></div>
      <div><Icon name="lucide:scan-line" /><span>Indexer mirrors state</span></div>
    </section>

    <section id="system-flow" class="how-flow">
      <header class="how-section-head">
        <div><span>01 / END-TO-END FLOW</span><h2>One market.<br>Five verified stages.</h2></div>
        <p>External data informs the market. Signed transactions change the market. The on-chain program alone enforces custody and settlement.</p>
      </header>

      <div class="how-flow-list">
        <article v-for="(step, index) in flow" :key="step.number" class="how-flow-step">
          <div class="how-step-number">{{ step.number }}</div>
          <div class="how-step-icon"><Icon :name="step.icon" /></div>
          <div class="how-step-copy">
            <span>{{ step.label }}</span>
            <h3>{{ step.title }}</h3>
            <p>{{ step.copy }}</p>
            <div class="how-step-meta">
              <small v-for="item in step.meta" :key="item">{{ item }}</small>
            </div>
          </div>
          <div v-if="index < flow.length - 1" class="how-step-connector"><i /></div>
        </article>
      </div>
    </section>

    <section class="how-rails">
      <header class="how-section-head compact">
        <div><span>02 / SEPARATION OF DUTIES</span><h2>Data proposes.<br>The program disposes.</h2></div>
      </header>
      <div class="how-rail-grid">
        <article class="data-rail">
          <div class="how-rail-card-head"><Icon name="lucide:radio-tower" /><span>DATA RAIL</span></div>
          <h3>TxLINE + oracle worker</h3>
          <ul>
            <li><Icon name="lucide:check" /> Delivers fixtures, odds, and match results</li>
            <li><Icon name="lucide:check" /> Maps the external fixture to its Market PDA</li>
            <li><Icon name="lucide:check" /> Signs market and result updates as the oracle</li>
          </ul>
          <p><Icon name="lucide:ban" /> Cannot transfer user tokens or bypass program rules.</p>
        </article>

        <article class="money-rail">
          <div class="how-rail-card-head"><Icon name="lucide:blocks" /><span>MONEY RAIL</span></div>
          <h3>Wallet + Solana program</h3>
          <ul>
            <li><Icon name="lucide:check" /> Requires the user’s signature to place a bet</li>
            <li><Icon name="lucide:check" /> Locks odds, stake, selection, and payout on-chain</li>
            <li><Icon name="lucide:check" /> Releases vault funds only under settlement rules</li>
          </ul>
          <p><Icon name="lucide:lock-keyhole" /> Pool collateral stays in program-controlled token accounts.</p>
        </article>
      </div>
    </section>

    <section class="how-settlement">
      <header class="how-section-head">
        <div><span>03 / SETTLEMENT</span><h2>What happens<br>after the whistle?</h2></div>
        <p>The stored selection and locked odds determine the result. The bot triggers settlement, but it cannot choose a different payout.</p>
      </header>

      <div class="settlement-branches">
        <article class="winner">
          <div><Icon name="lucide:trophy" /><span>WINNING BET</span></div>
          <h3>User receives the total return</h3>
          <p>The vault transfers <strong>stake × locked decimal odds</strong> to the bettor’s token account. The Bet account is marked settled.</p>
          <small>Example: 10 USDC × 2.40 = 24 USDC returned</small>
        </article>
        <article class="loser">
          <div><Icon name="lucide:shield" /><span>LOSING BET</span></div>
          <h3>The stake remains in the pool</h3>
          <p>No payout is sent to the bettor. The position’s reserved liability is released and the losing stake contributes to pool equity.</p>
          <small>Liquidity providers share pool gains and losses pro rata</small>
        </article>
        <article class="void">
          <div><Icon name="lucide:undo-2" /><span>VOID MARKET</span></div>
          <h3>The original stake is returned</h3>
          <p>If the oracle voids a cancelled or invalid market, settlement refunds the stake instead of applying win or loss logic.</p>
          <small>No odds-based profit is paid on a void position</small>
        </article>
      </div>
    </section>

    <section class="how-guardrails">
      <div class="how-guardrails-copy">
        <span>04 / TRUST BOUNDARIES</span>
        <h2>Automation can trigger.<br>It cannot rewrite the rules.</h2>
        <p>Each role has limited authority. That separation keeps market data, transaction approval, custody, and reporting from collapsing into one trusted server.</p>
      </div>
      <div class="guardrail-list">
        <article><Icon name="lucide:fingerprint" /><div><strong>Authorized oracle</strong><span>Only the oracle address configured in the pool can publish the final result.</span></div></article>
        <article><Icon name="lucide:file-lock-2" /><div><strong>Locked bet terms</strong><span>Stake, outcome, and odds are stored in the program-owned Bet account.</span></div></article>
        <article><Icon name="lucide:badge-check" /><div><strong>Program-enforced payout</strong><span>The contract derives the transfer from resolved state—not from bot input.</span></div></article>
        <article><Icon name="lucide:database" /><div><strong>Read-model indexing</strong><span>PostgreSQL powers fast portfolio views, but never controls settlement funds.</span></div></article>
      </div>
    </section>

    <section class="how-cta">
      <div>
        <span>READY TO FOLLOW A MARKET?</span>
        <h2>Pick a result.<br>Let the protocol handle the rest.</h2>
      </div>
      <div>
        <NuxtLink class="cup-primary" to="/matches">View markets <Icon name="lucide:arrow-up-right" /></NuxtLink>
        <NuxtLink to="/earn">Explore the pool <Icon name="lucide:arrow-right" /></NuxtLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.how-page{overflow:hidden}.how-hero{min-height:650px;padding:95px clamp(24px,6vw,96px);display:grid;grid-template-columns:minmax(0,1.05fr) minmax(420px,.95fr);gap:70px;align-items:center;border-bottom:1px solid var(--cup-line);background:radial-gradient(circle at 78% 45%,var(--cup-lime-soft),transparent 30rem)}.how-hero-copy{max-width:760px}.how-hero .cup-kicker{display:flex;align-items:center;gap:9px}.how-hero .cup-kicker i{width:7px;height:7px;border-radius:50%;background:var(--cup-lime);box-shadow:0 0 0 5px var(--cup-lime-soft)}.how-hero h1{margin:25px 0 24px;font-size:clamp(52px,6vw,94px);line-height:.94;letter-spacing:-.067em}.how-hero h1 em{color:var(--cup-lime);font-style:normal}.how-hero-copy>p{max-width:650px;margin:0;color:var(--cup-muted);font-size:16px;line-height:1.75}.how-hero-actions{margin-top:34px;display:flex;align-items:center;gap:25px}.how-hero-actions>a{display:flex;align-items:center;gap:9px;text-decoration:none}.how-hero-actions>a:not(.cup-primary){color:var(--cup-ink);font-size:12px;font-weight:700}
.how-hero-map{position:relative;min-height:430px;border:1px solid var(--cup-line);background:linear-gradient(135deg,var(--cup-panel),color-mix(in srgb,var(--cup-panel-2) 45%,var(--cup-panel)));box-shadow:28px 28px 0 var(--cup-lime-soft)}.how-hero-map:before{content:'';position:absolute;inset:0;background-image:linear-gradient(var(--cup-line) 1px,transparent 1px),linear-gradient(90deg,var(--cup-line) 1px,transparent 1px);background-size:48px 48px;opacity:.35}.how-map-node{position:absolute;z-index:2;width:116px;height:116px;display:grid;place-items:center;align-content:center;gap:6px;border:1px solid var(--cup-line);background:var(--cup-panel);box-shadow:0 14px 35px rgba(30,10,45,.08)}.how-map-node svg{width:26px;height:26px;color:var(--cup-lime)}.how-map-node span{font:700 11px 'DM Mono',monospace;letter-spacing:.08em}.how-map-node small{color:var(--cup-muted);font:500 8px 'DM Mono',monospace}.how-map-node.source{left:7%;top:17%}.how-map-node.oracle{left:39%;top:17%;border-color:color-mix(in srgb,var(--cup-lime) 65%,var(--cup-line))}.how-map-node.chain{right:7%;top:17%;color:#180f22;background:var(--cup-lime)}.how-map-node.chain svg{color:#180f22}.how-map-node.wallet{left:39%;bottom:10%}.how-map-arrow{position:absolute;z-index:2;width:23px;color:var(--cup-muted)}.arrow-one{left:32%;top:29%}.arrow-two{right:31%;top:29%}.arrow-user{left:48%;bottom:38%}.how-map-pulse{position:absolute;right:9%;bottom:11%;display:flex;gap:6px}.how-map-pulse span{width:6px;height:6px;border-radius:50%;background:var(--cup-lime);animation:how-pulse 1.4s infinite}.how-map-pulse span:nth-child(2){animation-delay:.2s}.how-map-pulse span:nth-child(3){animation-delay:.4s}@keyframes how-pulse{50%{opacity:.25;transform:translateY(-5px)}}
.how-rail{min-height:68px;padding:0 clamp(24px,6vw,96px);display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--cup-line);background:var(--cup-panel)}.how-rail>div{display:flex;align-items:center;justify-content:center;gap:9px;border-right:1px solid var(--cup-line);color:var(--cup-muted);font:500 9px 'DM Mono',monospace;letter-spacing:.06em;text-transform:uppercase}.how-rail>div:first-child{border-left:1px solid var(--cup-line)}.how-rail svg{width:15px;color:var(--cup-lime)}
.how-flow,.how-rails,.how-settlement,.how-guardrails{max-width:1500px;margin:auto;padding:105px clamp(24px,6vw,96px)}.how-section-head{display:grid;grid-template-columns:1fr minmax(280px,440px);gap:60px;align-items:end;margin-bottom:60px}.how-section-head span,.how-guardrails-copy>span,.how-cta span{color:var(--cup-muted);font:500 9px 'DM Mono',monospace;letter-spacing:.12em}.how-section-head h2,.how-guardrails h2,.how-cta h2{margin:13px 0 0;font-size:clamp(38px,4.5vw,66px);line-height:1;letter-spacing:-.055em}.how-section-head>p{margin:0;color:var(--cup-muted);line-height:1.75}.how-flow-list{border-top:1px solid var(--cup-line)}.how-flow-step{position:relative;min-height:245px;display:grid;grid-template-columns:80px 110px 1fr;border-bottom:1px solid var(--cup-line)}.how-step-number{padding-top:35px;color:var(--cup-muted);font:500 10px 'DM Mono',monospace}.how-step-icon{position:relative;display:grid;place-items:start center;padding-top:30px}.how-step-icon:before{content:'';position:absolute;top:0;bottom:0;left:50%;width:1px;background:var(--cup-line)}.how-step-icon svg{position:relative;z-index:1;width:54px;height:54px;padding:14px;border:1px solid var(--cup-line);color:var(--cup-lime);background:var(--cup-panel)}.how-step-copy{padding:34px 0 38px 30px}.how-step-copy>span{color:var(--cup-lime);font:600 9px 'DM Mono',monospace;letter-spacing:.12em}.how-step-copy h3{margin:9px 0 13px;font-size:clamp(22px,2.4vw,34px);letter-spacing:-.035em}.how-step-copy p{max-width:850px;margin:0;color:var(--cup-muted);line-height:1.7}.how-step-meta{display:flex;flex-wrap:wrap;gap:7px;margin-top:20px}.how-step-meta small{padding:6px 9px;border:1px solid var(--cup-line);color:var(--cup-muted);background:var(--cup-panel);font:500 8px 'DM Mono',monospace;text-transform:uppercase}.how-step-connector{display:none}
.how-rails{padding-top:30px}.how-section-head.compact{grid-template-columns:1fr}.how-rail-grid{display:grid;grid-template-columns:1fr 1fr}.how-rail-grid>article{padding:42px;border:1px solid var(--cup-line);background:var(--cup-panel)}.how-rail-grid .money-rail{margin-left:-1px;background:var(--cup-panel-2)}.how-rail-card-head{display:flex;align-items:center;gap:10px;color:var(--cup-lime);font:600 9px 'DM Mono',monospace;letter-spacing:.12em}.how-rail-card-head svg{width:18px}.how-rail-grid h3{margin:22px 0 28px;font-size:30px;letter-spacing:-.04em}.how-rail-grid ul{margin:0;padding:0;display:grid;gap:17px;list-style:none}.how-rail-grid li{display:flex;align-items:flex-start;gap:10px;color:var(--cup-muted);line-height:1.5}.how-rail-grid li svg{width:16px;flex:0 0 auto;margin-top:3px;color:var(--cup-lime)}.how-rail-grid article>p{margin:32px 0 0;padding-top:22px;display:flex;gap:10px;border-top:1px solid var(--cup-line);color:var(--cup-muted);font-size:12px;line-height:1.6}.how-rail-grid article>p svg{width:16px;flex:0 0 auto;color:var(--cup-lime)}
.how-settlement{padding-top:50px}.settlement-branches{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.settlement-branches article{min-height:310px;padding:31px;display:flex;flex-direction:column;border:1px solid var(--cup-line);background:var(--cup-panel)}.settlement-branches article>div{display:flex;align-items:center;gap:10px;color:var(--cup-muted);font:600 9px 'DM Mono',monospace;letter-spacing:.1em}.settlement-branches article>div svg{width:20px;color:var(--cup-lime)}.settlement-branches h3{margin:30px 0 14px;font-size:26px;line-height:1.08;letter-spacing:-.04em}.settlement-branches p{margin:0;color:var(--cup-muted);font-size:13px;line-height:1.7}.settlement-branches p strong{color:var(--cup-ink)}.settlement-branches small{margin-top:auto;padding-top:22px;border-top:1px solid var(--cup-line);color:var(--cup-muted);font:500 9px/1.5 'DM Mono',monospace}.settlement-branches .winner{border-top:3px solid var(--cup-lime)}.settlement-branches .loser{border-top:3px solid var(--cup-green)}.settlement-branches .void{border-top:3px solid var(--cup-muted)}
.how-guardrails{max-width:none;padding-inline:clamp(24px,6vw,96px);display:grid;grid-template-columns:minmax(280px,.8fr) minmax(460px,1.2fr);gap:90px;background:var(--cup-green);color:#f8efff}.how-guardrails-copy{max-width:620px}.how-guardrails-copy>span,.how-guardrails-copy>p{color:rgba(248,239,255,.65)}.how-guardrails-copy>p{margin:25px 0 0;line-height:1.75}.guardrail-list{border-top:1px solid rgba(255,255,255,.18)}.guardrail-list article{min-height:105px;display:grid;grid-template-columns:42px 1fr;gap:18px;align-items:center;border-bottom:1px solid rgba(255,255,255,.18)}.guardrail-list>article>svg{width:25px;color:var(--cup-lime)}.guardrail-list div{display:grid;gap:6px}.guardrail-list strong{font-size:15px}.guardrail-list span{color:rgba(248,239,255,.65);font-size:12px;line-height:1.5}
.how-cta{min-height:430px;padding:85px clamp(24px,8vw,130px);display:flex;align-items:center;justify-content:space-between;gap:60px;border-bottom:1px solid var(--cup-line);background:radial-gradient(circle at 85% 50%,var(--cup-lime-soft),transparent 24rem)}.how-cta>div:last-child{display:flex;align-items:center;gap:24px}.how-cta a{display:flex;align-items:center;gap:9px;text-decoration:none}.how-cta a:not(.cup-primary){color:var(--cup-ink);font-size:12px;font-weight:700}
@media(max-width:1000px){.how-hero{grid-template-columns:1fr}.how-hero-map{width:min(100%,620px)}.settlement-branches{grid-template-columns:1fr}.settlement-branches article{min-height:245px}.how-guardrails{grid-template-columns:1fr;gap:55px}.how-cta{align-items:flex-start;flex-direction:column;justify-content:center}}
@media(max-width:760px){.how-hero{min-height:0;padding:65px 20px 70px;gap:55px}.how-hero h1{font-size:54px}.how-hero-actions{align-items:flex-start;flex-direction:column}.how-hero-map{min-height:500px;box-shadow:12px 12px 0 var(--cup-lime-soft)}.how-map-node{width:104px;height:104px}.how-map-node.source{left:7%;top:8%}.how-map-node.oracle{right:7%;left:auto;top:8%}.how-map-node.chain{right:7%;top:auto;bottom:8%}.how-map-node.wallet{left:7%;bottom:8%}.arrow-one{left:45%;top:17%}.arrow-two{right:17%;top:47%;transform:rotate(90deg)}.arrow-user{left:45%;bottom:17%;transform:rotate(90deg)}.how-map-pulse{display:none}.how-rail{padding:0 20px;grid-template-columns:1fr 1fr}.how-rail>div{min-height:58px;border-bottom:1px solid var(--cup-line);font-size:8px}.how-flow,.how-rails,.how-settlement,.how-guardrails{padding:75px 20px}.how-section-head{grid-template-columns:1fr;gap:24px;margin-bottom:42px}.how-flow-step{grid-template-columns:46px 1fr;min-height:0}.how-step-number{display:none}.how-step-icon{grid-column:1;padding-top:27px}.how-step-icon svg{width:42px;height:42px;padding:10px}.how-step-copy{grid-column:2;padding:28px 0 34px 18px}.how-step-copy h3{font-size:23px}.how-rail-grid{grid-template-columns:1fr}.how-rail-grid>article{padding:28px 24px}.how-rail-grid .money-rail{margin:0;margin-top:-1px}.settlement-branches article{padding:27px 24px}.how-guardrails{gap:45px}.guardrail-list article{grid-template-columns:34px 1fr}.how-cta{min-height:390px;padding:65px 20px}.how-cta>div:last-child{align-items:flex-start;flex-direction:column}}
</style>
