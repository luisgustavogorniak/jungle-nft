import type { NetworkId, WalletProvider } from '@/api/contracts'

export const networkLabels: Record<NetworkId, string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }

export const providerLabels: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

/** "0xA91F…E82C" */
export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`
