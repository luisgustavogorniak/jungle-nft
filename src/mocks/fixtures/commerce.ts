export type CouponRecord = {
  code: string
  percentOff: number
  expiresAt: string
}

export const coupons: CouponRecord[] = [
  { code: 'KURIO10', percentOff: 10, expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'GENESIS25', percentOff: 25, expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'MINT2025', percentOff: 15, expiresAt: '2025-12-31T23:59:59.000Z' },
]

/** Flat network fee of the layout ("Taxa de rede 0.016 ETH"). */
export const NETWORK_FEE = '0.016'
