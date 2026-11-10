import { createTransaction, getDefaultVersions } from '@ledgerhq/hw-app-btc/lib/createTransaction'
import { splitTransaction } from '@ledgerhq/hw-app-btc/lib/splitTransaction'
import type { Transaction } from '@ledgerhq/hw-app-btc/lib/types'
import { splitTransaction as splitTransactionEsm } from '@ledgerhq/hw-app-btc/lib-es/splitTransaction'
import Transport from '@ledgerhq/hw-transport'
import { createHash } from 'crypto'
import { describe, expect, it, vi } from 'vitest'

import { fixtures, shieldedOutputFixture } from './__fixtures__/zcashV6'

const additionals = ['zcash', 'sapling']

describe.each([
  ['lib', splitTransaction],
  ['lib-es', splitTransactionEsm],
])('Zcash previous transactions (%s)', (_, split) => {
  it.each(fixtures)('parses $name and matches live explorer vout', fixture => {
    const tx = split(fixture.hex, true, true, additionals)
    expect(tx.version.readUInt32LE(0)).toBe(0x80000000 + fixture.version)
    expect(tx.nVersionGroupId?.readUInt32LE(0)).toBe(
      fixture.version === 6 ? 0xd884b698 : 0x26a7270a,
    )
    expect(tx.locktime).toEqual(Buffer.from(fixture.hex.slice(24, 32), 'hex'))
    expect(tx.nExpiryHeight).toEqual(Buffer.from(fixture.hex.slice(32, 40), 'hex'))
    expect(
      tx.outputs?.map(({ amount, script }) => ({
        amount: amount.toString('hex'),
        script: script.toString('hex'),
      })),
    ).toEqual(
      fixture.vout.map(({ value, script }) => {
        const amount = Buffer.alloc(8)
        amount.writeBigUInt64LE(BigInt(value))
        return { amount: amount.toString('hex'), script }
      }),
    )
  })

  it.each(fixtures.filter(fixture => fixture.version === 6))(
    'leaves the $name tail unparsed',
    fixture => {
      const tx = split(fixture.hex, true, true, additionals)
      expect(tx.extraData).toEqual(Buffer.alloc(0))
      expect(tx.sapling).toBeUndefined()
      expect(tx.orchard).toBeUndefined()
    },
  )

  it('preserves the entire v5 result captured from pristine 10.13.0', () => {
    const tx = split(fixtures[0].hex, true, true, additionals)
    expect(createHash('sha256').update(JSON.stringify(tx)).digest('hex')).toBe(
      'dffbfb67ca80fe499723ab84dcb9a6cf827fa447b8d97372660e1301623c680b',
    )
  })

  it('rejects a v6 version group ID from a different format', () => {
    const hex = fixtures[1].hex
    expect(() =>
      split(hex.slice(0, 8) + '0a27a726' + hex.slice(16), true, true, additionals),
    ).toThrow('unexpected Zcash v6 version group id')
  })
})

const mockTransport = () => {
  const transport = new Transport()
  const send = vi.spyOn(transport, 'send').mockImplementation(async (_cla, ins) => {
    if (ins === 0x40) {
      const publicKey = Buffer.from(
        '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798' +
          '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
        'hex',
      )
      return Buffer.concat([Buffer.from([65]), publicKey, Buffer.from([0]), Buffer.alloc(32)])
    }
    return Buffer.from('30009000', 'hex')
  })
  return { transport, send }
}

const createSpendingTransaction = async (previous: Transaction) => {
  const { transport, send } = mockTransport()
  const fixture = shieldedOutputFixture
  const tx = Object.assign(previous, {
    _customZcashTxId: fixture.txid,
    _customZcashAmount: fixture.vout[1].value,
  })
  const hex = await createTransaction(transport, {
    inputs: [[tx, 1, undefined, undefined, 3500000]],
    associatedKeysets: ["44'/133'/0'/0/0"],
    outputScriptHex: '0101000000000000000151',
    additionals,
    expiryHeight: Buffer.alloc(4),
    useTrustedInputForSegwit: false,
    blockHeight: 3543405,
  })
  return { hex, calls: send.mock.calls }
}

describe('Zcash spending transaction version guards', () => {
  it.each([
    { flags: ['zcash', 'sapling'], expiryHeight: Buffer.alloc(4), version: 0x80000005 },
    { flags: ['sapling'], expiryHeight: Buffer.alloc(4), version: 0x80000004 },
    { flags: ['zcash', 'sapling'], expiryHeight: undefined, version: 1 },
  ])(
    'selects $version with $flags and expiry $expiryHeight',
    ({ flags, expiryHeight, version }) => {
      expect(
        getDefaultVersions({
          isZcash: flags.includes('zcash'),
          sapling: flags.includes('sapling'),
          isDecred: false,
          expiryHeight,
        }).defaultVersion.readUInt32LE(0),
      ).toBe(version)
    },
  )

  it('streams shielded-funded output 1 and serializes v5 with the spending branch', async () => {
    const previous = splitTransaction(shieldedOutputFixture.hex, true, true, additionals)
    const { hex, calls } = await createSpendingTransaction(previous)
    const bytes = Buffer.from(hex, 'hex')
    expect(bytes.readUInt32LE(0)).toBe(0x80000005)
    expect(bytes.readUInt32LE(4)).toBe(0x26a7270a)
    expect(bytes.readUInt32LE(8)).toBe(0x77190ad9)
    expect(bytes.subarray(12, 20)).toEqual(Buffer.alloc(8))
    const headers = calls.filter(([, ins, p1]) => ins === 0x44 && p1 === 0)
    expect(headers).toHaveLength(2)
    headers.forEach(([, , , , data]) => {
      expect(data?.subarray(0, 12).toString('hex')).toBe('050000800a27a726d90a1977')
    })
    const fixture = shieldedOutputFixture
    const amount = Buffer.alloc(8)
    amount.writeBigUInt64LE(BigInt(fixture.vout[1].value))
    const expectedInput = Buffer.concat([
      Buffer.from([2]),
      Buffer.from(fixture.txid, 'hex').reverse(),
      Buffer.from('01000000', 'hex'),
      amount,
      Buffer.from([fixture.vout[1].script.length / 2]),
    ])
    const inputPackets = calls.filter(
      ([, ins, p1, , data]) => ins === 0x44 && p1 === 0x80 && data?.equals(expectedInput),
    )
    expect(inputPackets).toHaveLength(2)
    const expectedScript = Buffer.concat([
      Buffer.from(fixture.vout[1].script, 'hex'),
      Buffer.from('ffffffff', 'hex'),
    ])
    const scriptPackets = calls.filter(
      ([, ins, p1, , data]) => ins === 0x44 && p1 === 0x80 && data?.equals(expectedScript),
    )
    expect(scriptPackets).toHaveLength(2)
    expect(calls.some(([, ins]) => ins === 0x42)).toBe(false)
    expect(previous.consensusBranchId?.readUInt32LE(0)).toBe(0x37a5165b)
  })

  it('does not stream or serialize previous version/header/shielded data', async () => {
    const previous = splitTransaction(shieldedOutputFixture.hex, true, true, additionals)
    const baseline = await createSpendingTransaction(previous)
    const changed = await createSpendingTransaction({
      ...previous,
      version: Buffer.from('03000080', 'hex'),
      nVersionGroupId: Buffer.alloc(4, 0xff),
      consensusBranchId: Buffer.alloc(4, 0xee),
      locktime: Buffer.alloc(4, 0xdd),
      nExpiryHeight: Buffer.alloc(4, 0xcc),
      extraData: Buffer.alloc(64, 0xbb),
    })
    expect(changed.hex).toBe(baseline.hex)
    expect(changed.calls).toEqual(baseline.calls)
  })
})
