<script setup lang="ts">
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js'

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

const emit = defineEmits<{
  activated: []
  connectWallet: []
}>()

const props = withDefaults(defineProps<{
  replacement?: boolean
}>(), {
  replacement: false
})

const config = useRuntimeConfig()
const { connected, walletAddress, requireProvider } = useSolanaWallet()

const serviceLevel = ref<1 | 12>(1)
const pending = ref(false)
const currentStep = ref(0)
const errorMessage = ref('')
const txSignature = ref('')
const apiToken = ref('')
const copied = ref(false)

const steps = [
  'Confirm subscription',
  'Wait for Solana',
  'Sign API access',
  'Activate feed'
]

const cluster = computed(() => String(config.public.solanaCluster))
const isDevnet = computed(() => cluster.value === 'devnet')
const explorerUrl = computed(() => {
  if (!txSignature.value) return ''
  const suffix = cluster.value === 'mainnet-beta' ? '' : `?cluster=${cluster.value}`
  return `https://explorer.solana.com/tx/${txSignature.value}${suffix}`
})

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return window.btoa(binary)
}

function signatureBytes(value: { signature: Uint8Array } | Uint8Array) {
  return value instanceof Uint8Array ? value : value.signature
}

function associatedTokenAddress(mint: PublicKey, owner: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0]
}

function createUserTokenAccountInstruction(user: PublicKey) {
  const tokenMint = new PublicKey(String(config.public.txOddsTokenMint))
  const userTokenAccount = associatedTokenAddress(tokenMint, user)

  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: false, isWritable: false },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false }
    ],
    // Associated Token Program: CreateIdempotent
    data: new Uint8Array([1]) as any
  })
}

function subscribeInstruction(user: PublicKey) {
  const programId = new PublicKey(String(config.public.txOddsProgramId))
  const tokenMint = new PublicKey(String(config.public.txOddsTokenMint))
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('token_treasury_v2')],
    programId
  )
  const tokenTreasuryVault = associatedTokenAddress(tokenMint, tokenTreasuryPda)
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('pricing_matrix')],
    programId
  )
  const userTokenAccount = associatedTokenAddress(tokenMint, user)

  const data = new Uint8Array([
    254, 28, 191, 138, 156, 179, 183, 53,
    serviceLevel.value & 0xff,
    (serviceLevel.value >> 8) & 0xff,
    4
  ])

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: pricingMatrixPda, isSigner: false, isWritable: false },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: tokenTreasuryVault, isSigner: false, isWritable: true },
      { pubkey: tokenTreasuryPda, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
    ],
    data: data as any
  })
}

async function subscribeAndActivate() {
  if (!connected.value) {
    emit('connectWallet')
    return
  }

  if (isDevnet.value && serviceLevel.value !== 1) {
    serviceLevel.value = 1
  }

  pending.value = true
  currentStep.value = 1
  errorMessage.value = ''
  apiToken.value = ''
  copied.value = false

  try {
    const provider = requireProvider()
    if (!provider.signMessage) {
      throw new Error('This wallet does not support message signing.')
    }

    const user = new PublicKey(walletAddress.value)
    const latest = await $fetch<{
      blockhash: string
      lastValidBlockHeight: number
    }>('/api/solana/latest-blockhash')
    const transaction = new Transaction({
      feePayer: user,
      recentBlockhash: latest.blockhash
    }).add(
      createUserTokenAccountInstruction(user),
      subscribeInstruction(user)
    )

    const sent = await provider.signAndSendTransaction(transaction)
    txSignature.value = typeof sent === 'string' ? sent : sent.signature
    if (!txSignature.value) throw new Error('The wallet did not return a transaction signature.')

    currentStep.value = 2
    await $fetch('/api/solana/confirm', {
      method: 'POST',
      body: { signature: txSignature.value }
    })

    currentStep.value = 3
    const guest = await $fetch<{ guestJwt: string }>('/api/txodds/auth/guest', {
      method: 'POST'
    })
    const message = new TextEncoder().encode(`${txSignature.value}::${guest.guestJwt}`)
    const signedMessage = await provider.signMessage(message, 'utf8')
    const walletSignature = bytesToBase64(signatureBytes(signedMessage))

    currentStep.value = 4
    const activation = await $fetch<{ apiToken: string }>('/api/txodds/auth/activate', {
      method: 'POST',
      body: {
        guestJwt: guest.guestJwt,
        txSig: txSignature.value,
        walletSignature,
        leagues: []
      }
    })

    apiToken.value = activation.apiToken
    emit('activated')
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage ||
      error?.message ||
      'Subscription could not be completed.'
  } finally {
    pending.value = false
  }
}

async function copyToken() {
  if (!apiToken.value) return
  await navigator.clipboard.writeText(apiToken.value)
  copied.value = true
}

function generateAnotherToken() {
  currentStep.value = 0
  errorMessage.value = ''
  txSignature.value = ''
  apiToken.value = ''
  copied.value = false
}
</script>

<template>
  <section class="txline-activation" data-testid="txline-activation">
    <div class="txline-activation-copy">
      <span class="cup-kicker"><Icon name="lucide:key-round" /> TXLINE ACCESS</span>
      <h2>{{ props.replacement ? 'Generate a new API token' : 'Activate the World Cup feed' }}</h2>
      <p>{{ props.replacement ? 'Your existing token remains available until the new activation succeeds. Subscribe again, then copy the replacement token into the server environment.' : 'Subscribe on Solana for four weeks, then activate the API with the same wallet. The free bundle uses no TxL, but network fees still apply.' }}</p>

      <div class="txline-tier-picker">
        <label :class="{ selected: serviceLevel === 1 }">
          <input v-model="serviceLevel" type="radio" :value="1" :disabled="pending">
          <span>
            <strong>{{ isDevnet ? 'Real-time Devnet' : '60-sec delay' }}</strong>
            <small>Service level 1 · {{ isDevnet ? '0-sec sampling · ' : '' }}Free</small>
          </span>
        </label>
        <label v-if="!isDevnet" :class="{ selected: serviceLevel === 12 }">
          <input v-model="serviceLevel" type="radio" :value="12" :disabled="pending">
          <span><strong>Real-time</strong><small>Service level 12 · Free</small></span>
        </label>
      </div>
      <p v-if="isDevnet" class="txline-devnet-tier-note">
        <Icon name="lucide:zap" /> Devnet exposes service level 1 with zero-second sampling. Level 12 is available on Mainnet only.
      </p>

      <button
        class="txline-activate-button"
        :class="{ 'is-pending': pending }"
        type="button"
        :disabled="pending || Boolean(apiToken)"
        data-testid="txline-subscribe"
        @click="subscribeAndActivate"
      >
        <Icon :name="pending ? 'lucide:loader-circle' : apiToken ? 'lucide:circle-check' : 'lucide:wallet-cards'" />
        {{ apiToken ? 'New token generated' : pending ? steps[currentStep - 1] : connected ? props.replacement ? 'Subscribe & generate token' : 'Subscribe & activate' : 'Connect wallet to continue' }}
      </button>
    </div>

    <div class="txline-activation-status">
      <div class="txline-network-row">
        <span><i /> SOLANA {{ cluster.toUpperCase() }}</span>
        <strong>{{ walletAddress ? `${walletAddress.slice(0, 5)}…${walletAddress.slice(-5)}` : 'Wallet required' }}</strong>
      </div>

      <ol class="txline-steps">
        <li v-for="(step, index) in steps" :key="step" :class="{ active: currentStep === index + 1, done: apiToken || currentStep > index + 1 }">
          <span>{{ apiToken || currentStep > index + 1 ? '✓' : index + 1 }}</span>
          {{ step }}
        </li>
      </ol>

      <div v-if="errorMessage" class="txline-activation-error">
        <Icon name="lucide:circle-alert" />{{ errorMessage }}
      </div>

      <div v-if="txSignature" class="txline-result">
        <span>Subscription transaction</span>
        <a :href="explorerUrl" target="_blank" rel="noopener noreferrer">
          {{ txSignature.slice(0, 10) }}…{{ txSignature.slice(-8) }}
          <Icon name="lucide:external-link" />
        </a>
      </div>

      <div v-if="apiToken" class="txline-token-result">
        <div>
          <Icon name="lucide:shield-check" />
          <span><strong>API token activated</strong><small>Active for this server session</small></span>
        </div>
        <div class="txline-token-actions">
          <button type="button" @click="copyToken">
            <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" />{{ copied ? 'Copied' : 'Copy token' }}
          </button>
          <button type="button" @click="generateAnotherToken">
            <Icon name="lucide:refresh-cw" /> Generate another
          </button>
        </div>
        <p>Save it as <code>NUXT_TX_ODDS_API_TOKEN</code> before restarting the server.</p>
      </div>
    </div>
  </section>
</template>
