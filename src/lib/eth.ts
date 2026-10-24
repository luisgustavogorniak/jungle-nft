// ETH amounts travel as decimal strings ("1.19") and are computed as bigint wei,
// so there is no floating point error (0.1 + 0.2 === 0.3 here).

const DECIMALS = 18
const WEI_PER_ETH = 10n ** BigInt(DECIMALS)
const ETH_PATTERN = /^\d+(\.\d{1,18})?$/

export type EthString = string

export function isEthString(value: string): boolean {
  return ETH_PATTERN.test(value)
}

export function toWei(value: EthString): bigint {
  if (!isEthString(value)) throw new Error(`Invalid ETH amount: "${value}"`)
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * WEI_PER_ETH + BigInt(fraction.padEnd(DECIMALS, '0'))
}

/** Canonical string: trailing zeros trimmed, at least `minFractionDigits` decimals. */
export function fromWei(wei: bigint, minFractionDigits = 2): EthString {
  const sign = wei < 0n ? '-' : ''
  const abs = wei < 0n ? -wei : wei
  const whole = abs / WEI_PER_ETH
  let fraction = (abs % WEI_PER_ETH).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  fraction = fraction.padEnd(minFractionDigits, '0')
  return fraction ? `${sign}${whole}.${fraction}` : `${sign}${whole}`
}

export function addEth(...values: EthString[]): EthString {
  return fromWei(values.reduce((sum, value) => sum + toWei(value), 0n))
}

export function subEth(a: EthString, b: EthString): EthString {
  return fromWei(toWei(a) - toWei(b))
}

export function mulEth(value: EthString, quantity: number): EthString {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`Invalid quantity: ${quantity}`)
  return fromWei(toWei(value) * BigInt(quantity))
}

/** Percentage in basis points (1000 = 10%), rounded down to the wei. */
export function percentOfEth(value: EthString, basisPoints: number): EthString {
  return fromWei((toWei(value) * BigInt(basisPoints)) / 10_000n)
}

export function compareEth(a: EthString, b: EthString): -1 | 0 | 1 {
  const diff = toWei(a) - toWei(b)
  return diff === 0n ? 0 : diff < 0n ? -1 : 1
}

/** Display format: "1.19 ETH". */
export function formatEth(value: EthString): string {
  return `${fromWei(toWei(value))} ETH`
}

const CENTI_WEI = 10n ** 16n

/** Whole hundredths of an ETH (floor), for controls that need integers such as sliders. */
export function ethToCenti(value: EthString): number {
  return Number(toWei(value) / CENTI_WEI)
}

export function centiToEth(centi: number): EthString {
  return fromWei(BigInt(centi) * CENTI_WEI)
}
