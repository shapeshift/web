import * as ecc from '@bitcoinerlab/secp256k1'
import * as bitcoin from '@shapeshiftoss/bitcoinjs-lib'
import * as core from '@shapeshiftoss/hdwallet-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { REAL_V6_HEX, zip244Vector } from './__fixtures__/zcash'
import * as native from './native'

const mnemonic = 'all all all all all all all all all all all all'
const addressNList = core.bip32ToAddressNList("m/44'/133'/0'/0/0")
const scriptType = core.BTCInputScriptType.SpendAddress
const network = core.getNetwork('Zcash', scriptType)
const amount = '100000'
const branchId = core.ZCASH_CONSENSUS_BRANCH_ID
const v6FundingTxids = [
  '03b2314ec151125d47d73c513acbcb1ae53db206ea64a35df940c1cd8521deb3',
  'e513d7c45b9e430fde3ec0800f7ecd26d81fe996266dc179cad54065c7fe27a9',
]

const makePsbt = () =>
  new bitcoin.Psbt({ network, forkCoin: 'zec' })
    .setVersion(5)
    .setVersionGroupId(core.ZCASH_VERSION_GROUP_ID[5])
    .setConsensusBranchId(branchId)

describe('Zcash funding transaction versions', () => {
  let wallet: native.NativeHDWallet
  let prevTx: bitcoin.Transaction
  let input: core.BTCSignTxInputNative & { hex: string; scriptType: typeof scriptType }
  let msg: core.BTCSignTxNative
  let prevout: { script: Uint8Array; value: bigint }

  beforeEach(async () => {
    wallet = native.create({ deviceId: 'zcash-test' })
    await wallet.loadDevice({ mnemonic })
    await wallet.initialize()
    const address = await wallet.btcGetAddress({ coin: 'Zcash', addressNList, scriptType })
    if (!address) throw new Error('missing test address')
    prevout = { script: bitcoin.address.toOutputScript(address, network), value: BigInt(amount) }
    prevTx = new bitcoin.Transaction()
    prevTx.version = 5
    prevTx.overwintered = true
    prevTx.versionGroupId = core.ZCASH_VERSION_GROUP_ID[5]
    prevTx.consensusBranchId = branchId
    prevTx.addInput(Buffer.alloc(32, 1), 0)
    prevTx.addOutput(prevout.script, prevout.value)
    input = {
      addressNList,
      scriptType,
      amount,
      vout: 0,
      txid: prevTx.getId(),
      hex: prevTx.toHex(),
    }
    msg = {
      coin: 'Zcash',
      inputs: [input],
      outputs: [{ address, addressType: core.BTCOutputAddressType.Spend, amount: '90000' }],
    }
  })

  afterEach(() => vi.restoreAllMocks())

  it('is byte-identical to the nonWitnessUtxo path for v5 funding', async () => {
    const signed = await wallet.btcSignTx(msg)
    const buildInput = vi.spyOn(wallet, 'buildInput').mockResolvedValue({
      nonWitnessUtxo: Buffer.from(input.hex!, 'hex'),
    })
    const legacy = await wallet.btcSignTx(msg)
    expect(buildInput).toHaveBeenCalled()
    expect(signed?.serializedTx).toBeTruthy()
    expect(signed).toEqual(legacy)
  })

  it('signs v6 funding as v5 and commits to every declared prevout', async () => {
    // ZIP-229: the transparent-only v6 body adds an empty Ironwood component to v5.
    const header = Buffer.from(prevTx.toBuffer())
    header.writeUInt32LE(0x80000006, 0)
    header.writeUInt32LE(0xd884b698, 4)
    const inputs = v6FundingTxids.map((txid, locktime) => {
      header.writeUInt32LE(locktime, 12)
      const hex = Buffer.concat([header, Buffer.from([0])]).toString('hex')
      return { ...input, hex, txid }
    })
    expect(Buffer.from(prevout.script).toString('hex')).toBe(
      '76a914215d6f86cb4ad5ae994ae0e51cbaf4601dbbed6e88ac',
    )
    const signed = await wallet.btcSignTx({ ...msg, inputs })
    if (!signed) throw new Error('missing signed transaction')
    expect(Buffer.from(signed.serializedTx, 'hex').readUInt32LE(0)).toBe(0x80000005)
    const tx = bitcoin.Transaction.fromHex(signed.serializedTx)
    expect(tx.version).toBe(5)
    expect(tx.overwintered).toBe(true)
    expect(tx.versionGroupId).toBe(core.ZCASH_VERSION_GROUP_ID[5])
    expect(tx.consensusBranchId).toBe(branchId)
    const prevouts = [prevout, prevout]
    tx.ins.forEach((txInput, index) => {
      const chunks = bitcoin.script.decompile(txInput.script)!
      const { signature, hashType } = bitcoin.script.signature.decode(chunks[0] as Uint8Array)
      const publicKey = chunks[1] as Uint8Array
      expect(hashType).toBe(bitcoin.Transaction.SIGHASH_ALL)
      expect(ecc.verify(tx.hashForZIP244(index, prevouts, hashType), publicKey, signature)).toBe(
        true,
      )
      const otherIndex = 1 - index
      const wrongAmounts = prevouts.map((o, i) =>
        i === otherIndex ? { ...o, value: o.value + 1n } : o,
      )
      const wrongScripts = prevouts.map((o, i) =>
        i === otherIndex ? { ...o, script: Buffer.alloc(25) } : o,
      )
      expect(
        ecc.verify(tx.hashForZIP244(index, wrongAmounts, hashType), publicKey, signature),
      ).toBe(false)
      expect(
        ecc.verify(tx.hashForZIP244(index, wrongScripts, hashType), publicKey, signature),
      ).toBe(false)
    })
  })

  it('matches the independent ZIP-244 mixed-parent vector and pinned sighashes', async () => {
    const signed = await wallet.btcSignTx({
      coin: 'Zcash',
      inputs: zip244Vector.inputs.map(({ path, ...funding }) => ({
        ...funding,
        addressNList: core.bip32ToAddressNList(path),
        scriptType,
      })),
      outputs: [
        { ...zip244Vector.recipient, addressType: core.BTCOutputAddressType.Spend },
        {
          addressNList: core.bip32ToAddressNList(zip244Vector.change.path),
          amount: zip244Vector.change.amount,
          addressType: core.BTCOutputAddressType.Change,
          scriptType: core.BTCOutputScriptType.PayToAddress,
          isChange: true,
        },
      ],
    })
    if (!signed) throw new Error('missing signed transaction')
    const tx = bitcoin.Transaction.fromHex(signed.serializedTx)
    expect(tx.ins).toHaveLength(zip244Vector.sighashes.length)
    tx.ins.forEach((txInput, index) => {
      const chunks = bitcoin.script.decompile(txInput.script)!
      const { signature, hashType } = bitcoin.script.signature.decode(chunks[0] as Uint8Array)
      expect(hashType).toBe(bitcoin.Transaction.SIGHASH_ALL)
      expect(
        ecc.verify(
          Buffer.from(zip244Vector.sighashes[index], 'hex'),
          chunks[1] as Uint8Array,
          signature,
        ),
      ).toBe(true)
    })
    expect(signed.serializedTx).toBe(zip244Vector.signedHex)
    expect(
      tx.outs.map(({ script, value }) => ({
        script: Buffer.from(script).toString('hex'),
        amount: value.toString(),
      })),
    ).toEqual(zip244Vector.outputs)
  })

  it('does not parse a real mainnet v6 parent at buildInput/addInput', async () => {
    const hex = REAL_V6_HEX
    expect(() => bitcoin.Transaction.fromHex(hex)).toThrow()
    const inputData = await wallet.buildInput('Zcash', { ...input, hex }, 5)
    expect(inputData).toEqual({ witnessUtxo: prevout })
    expect(() =>
      makePsbt().addInput({
        hash: '6b1241fe3900879ad69fa164a7630fac697d41ef6ae1112db02c0d2369874904',
        index: 0,
        ...inputData,
      }),
    ).not.toThrow()
  })

  it.each([undefined, ''])('rejects a missing Zcash input amount (%s)', async missingAmount => {
    await expect(
      wallet.btcSignTx({ ...msg, inputs: [{ ...input, amount: missingAmount }] }),
    ).rejects.toThrow('missing amount for Zcash input')
  })

  it.each([amount, undefined])(
    'retains the full-parent path for v4 with amount %s',
    async value => {
      const { amount: originalAmount, ...withoutAmount } = input
      expect(originalAmount).toBe(amount)
      const v4Input = value === undefined ? withoutAmount : { ...withoutAmount, amount: value }
      expect(await wallet.buildInput('Zcash', v4Input, 4)).toEqual({
        nonWitnessUtxo: Buffer.from(input.hex!, 'hex'),
      })
    },
  )

  it('supports signature validation, PSBT export, finalization and fee checks', () => {
    const privateKey = Buffer.alloc(32, 1)
    const publicKey = ecc.pointFromScalar(privateKey)!
    const script = bitcoin.payments.p2pkh({ pubkey: publicKey }).output!
    const psbt = makePsbt()
      .addInput({ hash: '11'.repeat(32), index: 0, witnessUtxo: { script, value: 100000n } })
      .addOutput({ script, value: 90000n })
    psbt.signInput(0, { publicKey, sign: hash => ecc.sign(hash, privateKey) })
    expect(psbt.validateSignaturesOfAllInputs((key, hash, sig) => ecc.verify(hash, key, sig))).toBe(
      true,
    )
    expect(psbt.toBase64()).toBeTruthy()
    expect(psbt.toHex()).toBeTruthy()
    psbt.finalizeAllInputs()
    expect(psbt.getFee()).toBe(10000n)
    expect(psbt.extractTransaction().version).toBe(5)
  })

  it.each([
    ['none', 5, true],
    ['zec', 4, true],
    ['zec', 5, false],
  ] as const)(
    'keeps the non-segwit guard for %s v%s overwintered=%s',
    (forkCoin, version, overwintered) => {
      const privateKey = Buffer.alloc(32, 1)
      const publicKey = ecc.pointFromScalar(privateKey)!
      const script = bitcoin.payments.p2pkh({ pubkey: publicKey }).output!
      const psbt = new bitcoin.Psbt({ forkCoin }).setVersion(version)
      if (overwintered) psbt.setVersionGroupId(core.ZCASH_VERSION_GROUP_ID[version])
      psbt.addInput({ hash: '11'.repeat(32), index: 0, witnessUtxo: { script, value: 100000n } })
      psbt.addOutput({ script, value: 90000n })
      expect(() =>
        psbt.signInput(0, { publicKey, sign: hash => ecc.sign(hash, privateKey) }),
      ).toThrow('has witnessUtxo but non-segwit script')
    },
  )
})
