// @vitest-environment node
import ecc from '@bitcoinerlab/secp256k1'
import { address as bitcoinAddress, initEccLib, networks } from '@shapeshiftoss/bitcoinjs-lib'
import { describe, expect, it } from 'vitest'

import { getDustLimit, selectUtxos } from '../selectUtxos'

initEccLib(ecc)

const script = (address: string) => bitcoinAddress.toOutputScript(address, networks.bitcoin)

const WPKH = script('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')
const PKH = script('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH')
const SH = script('3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN')
const TR = script('bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr')

const select = (values: number[], amount: number, feePerByte = 1) =>
  selectUtxos({
    type: 'wpkh',
    utxos: values.map((value, vout) => ({ txid: 'a'.repeat(64), vout, value: BigInt(value) })),
    outputs: [{ script: WPKH, value: BigInt(amount) }],
    changeScript: WPKH,
    feePerByte: BigInt(feePerByte),
  })

describe('getDustLimit', () => {
  it('matches Bitcoin Core for each output type', () => {
    expect(getDustLimit(PKH)).toBe(546n)
    expect(getDustLimit(SH)).toBe(540n)
    expect(getDustLimit(WPKH)).toBe(294n)
    expect(getDustLimit(TR)).toBe(330n)
  })
})

describe('selectUtxos', () => {
  it('sizes native segwit inputs at their real size, not legacy', () => {
    // 10 overhead + 69 input + 31 recipient = 110 vbytes; legacy sizing would need 189
    expect(select([50_110], 50_000).inputs).toHaveLength(1)
    expect(() => select([50_109], 50_000)).toThrow('Insufficient balance')
  })

  it('keeps change at the dust limit and folds anything below it into the fee', () => {
    // change = total - 50_000 - 141 vbytes (with the change output)
    expect(select([50_435], 50_000).change).toBe(294n)
    expect(select([50_434], 50_000).change).toBe(0n)
  })

  it('keeps spendable change that coinselect leaves to the miner at high fee rates', () => {
    // coinselect wants 148 x 100 sats of change; 10_900 is well above the 294-sat dust limit
    expect(select([100_000], 75_000, 100).change).toBe(100_000n - 75_000n - 141n * 100n)
  })

  it('returns the original utxos', () => {
    const { inputs } = select([10_000, 200_000], 100_000)

    expect(inputs).toEqual([{ txid: 'a'.repeat(64), vout: 1, value: 200_000n }])
  })
})
