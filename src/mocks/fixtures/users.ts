import type { User, Wallet } from '@/api/contracts'

export type UserRecord = User & { passwordHash: string; salt: string }

/** Fictitious credentials, documented in the README. */
export const demoPassword = 'Kurio@2026'

export const demoUsers: Array<User & { salt: string }> = [
  {
    id: 'user-nova',
    username: 'novasato',
    displayName: 'Nova Sato',
    email: 'nova@kurio.test',
    avatarUrl: null,
    ensName: 'nova.kurio.eth',
    walletNickname: 'Principal',
    salt: 'b7e1c2a9',
  },
  {
    id: 'user-leo',
    username: 'leoarcos',
    displayName: 'Leo Arcos',
    email: 'leo@kurio.test',
    avatarUrl: null,
    ensName: null,
    walletNickname: 'Leo Main',
    salt: '4f0d93e6',
  },
]

const updatedAt = '2026-10-20T12:00:00.000Z'

export const demoWallets: Record<string, Wallet[]> = {
  'user-nova': [
    {
      id: 'wallet-nova-primary',
      slot: 'primary',
      displayName: 'Nova Sato',
      nickname: 'Principal',
      network: 'ethereum',
      profileName: 'Nova',
      address: '0xA91F3c5D7e2B4a6C8d0E1f2A3b4C5d6E7f80E82C',
      secondaryAddress: null,
      provider: 'metamask',
      referralCode: 'KURIO-NOVA',
      email: 'nova@kurio.test',
      ensName: 'nova.kurio.eth',
      updatedAt,
    },
    {
      id: 'wallet-nova-secondary',
      slot: 'secondary',
      displayName: 'Nova Sato',
      nickname: 'Reserva',
      network: 'polygon',
      profileName: 'Nova',
      address: '0x5B2e8C1d4F7a9B3c6D0e2F4a8B1c5D7e9F3a6C12',
      secondaryAddress: null,
      provider: 'coinbase',
      referralCode: 'KURIO-NOVA',
      email: 'nova@kurio.test',
      ensName: 'nova.kurio.eth',
      updatedAt,
    },
  ],
  // Leo has no secondary wallet: exercises the empty state.
  'user-leo': [
    {
      id: 'wallet-leo-primary',
      slot: 'primary',
      displayName: 'Leo Arcos',
      nickname: 'Leo Main',
      network: 'ethereum',
      profileName: 'Leo',
      address: '0x3C7d9E1f5A2b8C4d6E0f1A3b5C7d9E2f4A6b8D01',
      secondaryAddress: null,
      provider: 'walletconnect',
      referralCode: 'KURIO-LEO',
      email: 'leo@kurio.test',
      ensName: 'leo.kurio.eth',
      updatedAt,
    },
  ],
}

export const demoFavorites: Record<string, string[]> = {
  'user-nova': ['emerald-ape-042', 'neon-vessel-552'],
  'user-leo': ['golden-beat-207'],
}
