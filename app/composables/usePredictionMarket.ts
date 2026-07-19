import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js'

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
const POOL_DISCRIMINATOR = [241, 154, 109, 4, 17, 177, 109, 188]
const MARKET_DISCRIMINATOR = [219, 190, 213, 55, 0, 227, 198, 154]
const LIQUIDITY_DISCRIMINATOR = [153, 56, 106, 34, 55, 42, 113, 176]
const FAUCET_DISCRIMINATOR = [226, 121, 83, 120, 145, 233, 226, 179]
const INITIALIZE_POOL_DISCRIMINATOR = [95, 180, 10, 172, 84, 174, 232, 40]
const CLAIM_FAUCET_DISCRIMINATOR = [80, 7, 251, 108, 55, 145, 135, 68]
const INITIALIZE_LIQUIDITY_DISCRIMINATOR = [8, 245, 87, 39, 30, 245, 116, 193]
const FUND_POOL_DISCRIMINATOR = [36, 57, 233, 176, 181, 20, 87, 159]
const WITHDRAW_POOL_DISCRIMINATOR = [190, 43, 148, 248, 68, 5, 215, 136]
const PLACE_BET_DISCRIMINATOR = [222, 62, 67, 220, 63, 166, 126, 33]

export const MOCK_USDC_SCALE = 1_000_000n
export const ODDS_SCALE = 10_000n
export const FAUCET_CLAIM_AMOUNT = 1_000n * MOCK_USDC_SCALE

export type PredictionPool = {
  address: string
  authority: string
  oracle: string
  collateralMint: string
  vault: string
  vaultBalance: bigint
  totalShares: bigint
  reservedLiability: bigint
  minStake: bigint
  maxPayout: bigint
  paused: boolean
}

export type PredictionMarket = {
  address: string
  matchId: Uint8Array
  odds: [bigint, bigint, bigint]
  bettingClosesAt: bigint
  status: 'open' | 'resolved' | 'voided'
  result: number
  totalStaked: bigint
  unsettledLiability: bigint
}

type RpcAccount = {
  data: [string, 'base64']
  owner: string
}

type AccountResponse = {
  account: RpcAccount | null
}

function seed(value: string) {
  return new TextEncoder().encode(value)
}

function fromBase64(value: string) {
  const binary = window.atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

function toBase64(value: Uint8Array) {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return window.btoa(binary)
}

function matchesDiscriminator(data: Uint8Array, discriminator: number[]) {
  return discriminator.every((byte, index) => data[index] === byte)
}

function readU64(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(offset, true)
}

function readI64(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getBigInt64(offset, true)
}

function writeU64(value: bigint) {
  if (value < 0n || value > 18_446_744_073_709_551_615n) {
    throw new Error('Value is outside the on-chain u64 range.')
  }
  const bytes = new Uint8Array(8)
  new DataView(bytes.buffer).setBigUint64(0, value, true)
  return bytes
}

function concatBytes(...parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

function publicKeyAt(data: Uint8Array, offset: number) {
  return new PublicKey(data.slice(offset, offset + 32))
}

export function parseMockUsdc(input: string | number) {
  const normalized = String(input).trim()
  if (!/^\d+(\.\d{0,6})?$/.test(normalized)) {
    throw new Error('Enter a mock USDC amount with no more than 6 decimals.')
  }
  const [whole, fraction = ''] = normalized.split('.')
  return BigInt(whole!) * MOCK_USDC_SCALE + BigInt((fraction + '000000').slice(0, 6))
}

export function formatMockUsdc(amount: bigint, maximumFractionDigits = 2) {
  const negative = amount < 0n
  const absolute = negative ? -amount : amount
  const whole = absolute / MOCK_USDC_SCALE
  const fraction = (absolute % MOCK_USDC_SCALE).toString().padStart(6, '0')
  const visible = fraction.slice(0, Math.max(0, Math.min(6, maximumFractionDigits))).replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole.toLocaleString()}${visible ? `.${visible}` : ''}`
}

export function usePredictionMarket() {
  const config = useRuntimeConfig()
  const { walletAddress, requireProvider } = useSolanaWallet()
  const programId = new PublicKey(String(config.public.predictionMarketProgramId))
  const cluster = String(config.public.predictionMarketCluster || 'devnet')
  const [poolAddress] = PublicKey.findProgramAddressSync([seed('pool')], programId)
  const [mintAddress] = PublicKey.findProgramAddressSync([seed('mock_usdc_mint')], programId)

  function associatedTokenAddress(owner: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0]
  }

  function marketAddress(matchId: Uint8Array) {
    return PublicKey.findProgramAddressSync([seed('market'), matchId], programId)[0]
  }

  function faucetReceiptAddress(user: PublicKey) {
    return PublicKey.findProgramAddressSync([seed('faucet'), user.toBuffer()], programId)[0]
  }

  function liquidityPositionAddress(provider: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [seed('liquidity'), poolAddress.toBuffer(), provider.toBuffer()],
      programId
    )[0]
  }

  function betAddress(positionId: Uint8Array) {
    return PublicKey.findProgramAddressSync([seed('bet'), positionId], programId)[0]
  }

  async function toMatchId(externalId: string | number) {
    return new Uint8Array(await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(String(externalId).trim())
    ))
  }

  function createPositionId(): Uint8Array {
    const id = crypto.getRandomValues(new Uint8Array(32))
    return id.every(byte => byte === 0) ? createPositionId() : id
  }

  function positionIdHex(id: Uint8Array) {
    return [...id].map(byte => byte.toString(16).padStart(2, '0')).join('')
  }

  async function fetchAccount(address: PublicKey) {
    const response = await $fetch<AccountResponse>(`/api/solana/account/${address.toBase58()}`)
    return response.account
  }

  function decodeProgramAccount(account: RpcAccount, discriminator: number[], minimumLength: number) {
    if (account.owner !== programId.toBase58()) {
      throw new Error('The account is not owned by the configured prediction-market program.')
    }
    const data = fromBase64(account.data[0])
    if (data.length < minimumLength || !matchesDiscriminator(data, discriminator)) {
      throw new Error('The on-chain account has an unexpected layout.')
    }
    return data
  }

  async function fetchPool(): Promise<PredictionPool | null> {
    const account = await fetchAccount(poolAddress)
    if (!account) return null
    const data = decodeProgramAccount(account, POOL_DISCRIMINATOR, 170)
    return {
      address: poolAddress.toBase58(),
      authority: publicKeyAt(data, 8).toBase58(),
      oracle: publicKeyAt(data, 40).toBase58(),
      collateralMint: publicKeyAt(data, 72).toBase58(),
      vault: publicKeyAt(data, 104).toBase58(),
      vaultBalance: await fetchTokenBalance(poolAddress),
      totalShares: readU64(data, 136),
      reservedLiability: readU64(data, 144),
      minStake: readU64(data, 152),
      maxPayout: readU64(data, 160),
      paused: data[168] === 1
    }
  }

  async function fetchMarket(externalId: string | number): Promise<PredictionMarket | null> {
    const matchId = await toMatchId(externalId)
    const address = marketAddress(matchId)
    const account = await fetchAccount(address)
    if (!account) return null
    const data = decodeProgramAccount(account, MARKET_DISCRIMINATOR, 139)
    const status = data[104] === 0 ? 'open' : data[104] === 1 ? 'resolved' : 'voided'
    return {
      address: address.toBase58(),
      matchId,
      odds: [readU64(data, 72), readU64(data, 80), readU64(data, 88)],
      bettingClosesAt: readI64(data, 96),
      status,
      result: data[105]!,
      totalStaked: readU64(data, 106),
      unsettledLiability: readU64(data, 114)
    }
  }

  async function fetchTokenBalance(owner: PublicKey) {
    const account = await fetchAccount(associatedTokenAddress(owner))
    if (!account) return 0n
    if (account.owner !== TOKEN_PROGRAM_ID.toBase58()) {
      throw new Error('The mock USDC account is not owned by the classic SPL Token program.')
    }
    const data = fromBase64(account.data[0])
    if (data.length < 165 || !publicKeyAt(data, 0).equals(mintAddress) || !publicKeyAt(data, 32).equals(owner)) {
      throw new Error('The mock USDC token account failed validation.')
    }
    return readU64(data, 64)
  }

  async function fetchWalletState() {
    if (!walletAddress.value) return { balance: 0n, faucetClaimed: false, shares: 0n }
    const user = new PublicKey(walletAddress.value)
    const receipt = await fetchAccount(faucetReceiptAddress(user))
    if (receipt) decodeProgramAccount(receipt, FAUCET_DISCRIMINATOR, 57)
    const position = await fetchAccount(liquidityPositionAddress(user))
    let shares = 0n
    if (position) {
      const data = decodeProgramAccount(position, LIQUIDITY_DISCRIMINATOR, 81)
      if (!publicKeyAt(data, 40).equals(user)) throw new Error('The LP position belongs to another wallet.')
      shares = readU64(data, 72)
    }
    return {
      balance: await fetchTokenBalance(user),
      faucetClaimed: Boolean(receipt),
      shares
    }
  }

  function createAssociatedTokenInstruction(payer: PublicKey, owner: PublicKey) {
    return new TransactionInstruction({
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: associatedTokenAddress(owner), isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: mintAddress, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
      ],
      data: new Uint8Array([1]) as any
    })
  }

  async function simulateAndSend(instructions: TransactionInstruction[]) {
    if (!walletAddress.value) throw new Error('Connect a wallet before submitting.')
    const provider = requireProvider()
    const user = new PublicKey(walletAddress.value)
    const latest = await $fetch<{ blockhash: string }>('/api/solana/latest-blockhash', {
      query: { scope: 'prediction-market' }
    })
    const transaction = new Transaction({
      feePayer: user,
      recentBlockhash: latest.blockhash
    }).add(...instructions)
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    })
    await $fetch('/api/solana/simulate', {
      method: 'POST',
      body: { transaction: toBase64(serialized) }
    })
    const sent = await provider.signAndSendTransaction(transaction)
    const signature = typeof sent === 'string' ? sent : sent.signature
    if (!signature) throw new Error('The wallet did not return a transaction signature.')
    await $fetch('/api/solana/confirm', {
      method: 'POST',
      body: { signature, scope: 'prediction-market' }
    })
    return signature
  }

  async function claimFaucet() {
    const user = new PublicKey(walletAddress.value)
    const pool = await fetchPool()
    if (!pool) {
      throw new Error(
        `The prediction-market pool is not initialized on ${cluster}. Run initialize_pool before using the faucet.`
      )
    }
    if (pool.collateralMint !== mintAddress.toBase58()) {
      throw new Error('The initialized pool uses an unexpected collateral mint.')
    }
    const receipt = faucetReceiptAddress(user)
    if (await fetchAccount(receipt)) throw new Error('This wallet has already claimed the faucet.')
    const userToken = associatedTokenAddress(user)
    const instructions: TransactionInstruction[] = []
    if (!await fetchAccount(userToken)) instructions.push(createAssociatedTokenInstruction(user, user))
    instructions.push(new TransactionInstruction({
      programId,
      keys: [
        { pubkey: user, isSigner: true, isWritable: true },
        { pubkey: poolAddress, isSigner: false, isWritable: false },
        { pubkey: mintAddress, isSigner: false, isWritable: true },
        { pubkey: userToken, isSigner: false, isWritable: true },
        { pubkey: receipt, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data: new Uint8Array(CLAIM_FAUCET_DISCRIMINATOR) as any
    }))
    return simulateAndSend(instructions)
  }

  async function initializePool(options: {
    oracle: string
    minStake: bigint
    maxPayout: bigint
    initialLiquidity: bigint
  }) {
    if (cluster !== 'devnet') {
      throw new Error('Pool initialization is restricted to devnet in this frontend.')
    }
    if (!walletAddress.value) throw new Error('Connect the intended pool authority wallet first.')
    if (options.minStake <= 0n || options.maxPayout < options.minStake || options.initialLiquidity < 0n) {
      throw new Error('Minimum stake must be positive, maximum payout must cover it, and liquidity cannot be negative.')
    }
    if (await fetchPool()) {
      throw new Error('The prediction-market pool is already initialized.')
    }

    const authority = new PublicKey(walletAddress.value)
    let oracle: PublicKey
    try {
      oracle = new PublicKey(options.oracle.trim())
    } catch {
      throw new Error('Enter a valid Solana oracle address.')
    }
    if (oracle.equals(PublicKey.default)) throw new Error('The oracle cannot be the default address.')

    const vault = associatedTokenAddress(poolAddress)
    const authorityPosition = liquidityPositionAddress(authority)
    const instruction = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: poolAddress, isSigner: false, isWritable: true },
        { pubkey: mintAddress, isSigner: false, isWritable: true },
        { pubkey: vault, isSigner: false, isWritable: true },
        { pubkey: authorityPosition, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data: concatBytes(
        new Uint8Array(INITIALIZE_POOL_DISCRIMINATOR),
        new Uint8Array(oracle.toBytes()),
        writeU64(options.minStake),
        writeU64(options.maxPayout),
        writeU64(options.initialLiquidity)
      ) as any
    })
    return simulateAndSend([instruction])
  }

  async function placeBet(externalId: string | number, outcome: number, stake: bigint) {
    if (outcome < 0 || outcome > 2) throw new Error('Invalid market outcome.')
    const user = new PublicKey(walletAddress.value)
    const pool = await fetchPool()
    const market = await fetchMarket(externalId)
    if (!pool) throw new Error('The prediction pool is not initialized on this network.')
    if (!market) throw new Error('This fixture has not been published on-chain by the oracle.')
    if (pool.paused) throw new Error('The prediction pool is paused.')
    if (market.status !== 'open' || market.bettingClosesAt <= BigInt(Math.floor(Date.now() / 1000))) {
      throw new Error('Betting is closed for this market.')
    }
    const expectedOdds = market.odds[outcome]!
    if (expectedOdds === 0n) throw new Error('That outcome is disabled on-chain.')
    const positionId = createPositionId()
    const bet = betAddress(positionId)
    const instruction = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: user, isSigner: true, isWritable: true },
        { pubkey: associatedTokenAddress(user), isSigner: false, isWritable: true },
        { pubkey: poolAddress, isSigner: false, isWritable: true },
        { pubkey: mintAddress, isSigner: false, isWritable: false },
        { pubkey: new PublicKey(pool.vault), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(market.address), isSigner: false, isWritable: true },
        { pubkey: bet, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data: concatBytes(
        new Uint8Array(PLACE_BET_DISCRIMINATOR),
        positionId,
        new Uint8Array([outcome]),
        writeU64(stake),
        writeU64(expectedOdds)
      ) as any
    })
    const signature = await simulateAndSend([instruction])
    return {
      signature,
      positionId,
      positionIdHex: positionIdHex(positionId),
      betAddress: bet.toBase58(),
      market,
      expectedOdds,
      payout: stake * expectedOdds / ODDS_SCALE
    }
  }

  async function fundPool(amount: bigint) {
    if (amount <= 0n) throw new Error('Deposit amount must be greater than zero.')
    const user = new PublicKey(walletAddress.value)
    const pool = await fetchPool()
    if (!pool) throw new Error('The prediction pool is not initialized on this network.')
    if (pool.collateralMint !== mintAddress.toBase58()) {
      throw new Error('The initialized pool uses an unexpected collateral mint.')
    }
    const userTokenAccount = associatedTokenAddress(user)
    if (!await fetchAccount(userTokenAccount)) {
      throw new Error('Claim mock USDC from the faucet before depositing.')
    }
    if (amount > await fetchTokenBalance(user)) {
      throw new Error('Deposit amount exceeds the connected wallet balance.')
    }
    const position = liquidityPositionAddress(user)
    const instructions: TransactionInstruction[] = []
    if (!await fetchAccount(position)) {
      instructions.push(new TransactionInstruction({
        programId,
        keys: [
          { pubkey: user, isSigner: true, isWritable: true },
          { pubkey: poolAddress, isSigner: false, isWritable: false },
          { pubkey: position, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        data: new Uint8Array(INITIALIZE_LIQUIDITY_DISCRIMINATOR) as any
      }))
    }
    instructions.push(new TransactionInstruction({
      programId,
      keys: [
        { pubkey: user, isSigner: true, isWritable: false },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolAddress, isSigner: false, isWritable: true },
        { pubkey: position, isSigner: false, isWritable: true },
        { pubkey: mintAddress, isSigner: false, isWritable: false },
        { pubkey: new PublicKey(pool.vault), isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
      ],
      data: concatBytes(new Uint8Array(FUND_POOL_DISCRIMINATOR), writeU64(amount)) as any
    }))
    return simulateAndSend(instructions)
  }

  async function withdrawPool(shares: bigint) {
    if (shares <= 0n) throw new Error('LP shares to withdraw must be greater than zero.')
    const user = new PublicKey(walletAddress.value)
    const pool = await fetchPool()
    if (!pool) throw new Error('The prediction pool is not initialized on this network.')
    if (pool.collateralMint !== mintAddress.toBase58()) {
      throw new Error('The initialized pool uses an unexpected collateral mint.')
    }
    const walletState = await fetchWalletState()
    if (shares > walletState.shares) {
      throw new Error('Withdrawal exceeds the connected wallet LP shares.')
    }
    const userTokenAccount = associatedTokenAddress(user)
    const instructions: TransactionInstruction[] = []
    if (!await fetchAccount(userTokenAccount)) {
      instructions.push(createAssociatedTokenInstruction(user, user))
    }
    instructions.push(new TransactionInstruction({
      programId,
      keys: [
        { pubkey: user, isSigner: true, isWritable: false },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolAddress, isSigner: false, isWritable: true },
        { pubkey: liquidityPositionAddress(user), isSigner: false, isWritable: true },
        { pubkey: mintAddress, isSigner: false, isWritable: false },
        { pubkey: new PublicKey(pool.vault), isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
      ],
      data: concatBytes(new Uint8Array(WITHDRAW_POOL_DISCRIMINATOR), writeU64(shares)) as any
    }))
    return simulateAndSend(instructions)
  }

  function explorerTransactionUrl(signature: string) {
    const suffix = cluster === 'mainnet-beta' ? '' : `?cluster=${encodeURIComponent(cluster)}`
    return `https://explorer.solana.com/tx/${signature}${suffix}`
  }

  return {
    cluster,
    programId: programId.toBase58(),
    poolAddress: poolAddress.toBase58(),
    mintAddress: mintAddress.toBase58(),
    toMatchId,
    marketAddress,
    fetchPool,
    fetchMarket,
    fetchWalletState,
    initializePool,
    claimFaucet,
    placeBet,
    fundPool,
    withdrawPool,
    explorerTransactionUrl
  }
}
