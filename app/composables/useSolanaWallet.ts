import type { Transaction } from '@solana/web3.js'

export type SolanaWalletName = 'Phantom' | 'Solflare'

type WalletPublicKey = {
  toString: () => string
}

type InjectedWallet = {
  publicKey?: WalletPublicKey | null
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: WalletPublicKey }>
  disconnect?: () => Promise<void>
  signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string } | string>
  signMessage?: (
    message: Uint8Array,
    display?: 'utf8'
  ) => Promise<{ signature: Uint8Array } | Uint8Array>
}

const WALLET_STORAGE_KEY = 'cupmarket-solana-wallet'

declare global {
  interface Window {
    solana?: InjectedWallet
    solflare?: InjectedWallet
  }
}

function injectedProvider(name: SolanaWalletName | '') {
  if (!import.meta.client || !name) return undefined
  return name === 'Phantom' ? window.solana : window.solflare
}

export function useSolanaWallet() {
  const walletName = useState<SolanaWalletName | ''>('solana-wallet-name', () => '')
  const walletAddress = useState('solana-wallet-address', () => '')

  const walletLabel = computed(() => walletAddress.value
    ? `${walletAddress.value.slice(0, 4)}…${walletAddress.value.slice(-4)}`
    : 'Connect wallet'
  )

  function persist(name: SolanaWalletName) {
    if (import.meta.client) localStorage.setItem(WALLET_STORAGE_KEY, name)
  }

  function clearState() {
    walletName.value = ''
    walletAddress.value = ''
  }

  async function connect(name: SolanaWalletName, options?: { silent?: boolean }) {
    const provider = injectedProvider(name)
    if (!provider) {
      throw new Error(`${name} was not found. Install the extension, then try again.`)
    }

    const response = await provider.connect(options?.silent ? { onlyIfTrusted: true } : undefined)
    const address = response?.publicKey?.toString() || provider.publicKey?.toString()
    if (!address) throw new Error(`${name} did not return a wallet address.`)

    walletName.value = name
    walletAddress.value = address
    persist(name)
    return address
  }

  async function restore() {
    if (!import.meta.client || walletAddress.value) return walletAddress.value
    const saved = localStorage.getItem(WALLET_STORAGE_KEY)
    if (saved !== 'Phantom' && saved !== 'Solflare') return ''

    try {
      return await connect(saved, { silent: true })
    } catch {
      clearState()
      return ''
    }
  }

  async function disconnect() {
    const provider = injectedProvider(walletName.value)
    try {
      await provider?.disconnect?.()
    } finally {
      clearState()
      if (import.meta.client) localStorage.removeItem(WALLET_STORAGE_KEY)
    }
  }

  function requireProvider() {
    const provider = injectedProvider(walletName.value)
    const currentAddress = provider?.publicKey?.toString()

    if (!provider || !walletAddress.value || currentAddress !== walletAddress.value) {
      throw new Error('Reconnect the wallet before subscribing.')
    }

    return provider
  }

  return {
    walletName,
    walletAddress,
    walletLabel,
    connected: computed(() => Boolean(walletAddress.value)),
    connect,
    restore,
    disconnect,
    requireProvider
  }
}
