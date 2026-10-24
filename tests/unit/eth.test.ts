import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { addEth, compareEth, formatEth, fromWei, mulEth, percentOfEth, subEth, toWei } from '../../src/lib/eth.ts'

describe('eth', () => {
  it('round-trips decimal strings through wei', () => {
    assert.equal(toWei('1'), 10n ** 18n)
    assert.equal(fromWei(toWei('1.19')), '1.19')
    assert.equal(fromWei(toWei('0.016')), '0.016')
    assert.equal(fromWei(toWei('2')), '2.00')
  })

  it('has no floating point error', () => {
    assert.equal(addEth('0.1', '0.2'), '0.30')
  })

  it('reproduces the cart totals from the layout', () => {
    const subtotal = addEth(mulEth('1.19', 2), mulEth('1.39', 6), mulEth('1.79', 9))
    assert.equal(subtotal, '26.83')
    assert.equal(addEth(subtotal, '0.016'), '26.846')
  })

  it('applies percentage discounts in basis points', () => {
    assert.equal(percentOfEth('26.83', 1000), '2.683')
    assert.equal(subEth('26.83', percentOfEth('26.83', 1000)), '24.147')
  })

  it('compares amounts', () => {
    assert.equal(compareEth('1.19', '1.190'), 0)
    assert.equal(compareEth('0.99', '1'), -1)
  })

  it('formats for display', () => {
    assert.equal(formatEth('26.8460'), '26.846 ETH')
  })

  it('rejects invalid input', () => {
    assert.throws(() => toWei('1,19'))
    assert.throws(() => toWei('-1'))
    assert.throws(() => mulEth('1', 1.5))
  })
})
