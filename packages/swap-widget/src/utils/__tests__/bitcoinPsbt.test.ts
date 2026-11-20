import { base64, hex } from '@scure/base'
import {
  Address,
  NETWORK,
  OutScript,
  p2pkh,
  p2sh,
  p2tr,
  p2wpkh,
  Script,
  Transaction,
} from '@scure/btc-signer'
import { describe, expect, it } from 'vitest'

import type { BitcoinUtxo } from '../bitcoinPsbt'
import { buildTransferPsbt, finalizeSignedPsbt } from '../bitcoinPsbt'

const PRIVATE_KEY = hex.decode(`${'00'.repeat(31)}01`)
const PUBLIC_KEY = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
const PUBLIC_KEY_BYTES = hex.decode(PUBLIC_KEY)

const WPKH_ADDRESS = p2wpkh(PUBLIC_KEY_BYTES, NETWORK).address as string
const SH_ADDRESS = p2sh(p2wpkh(PUBLIC_KEY_BYTES, NETWORK), NETWORK).address as string
const TR_ADDRESS = p2tr(PUBLIC_KEY_BYTES.slice(1), undefined, NETWORK).address as string
const PKH_ADDRESS = p2pkh(PUBLIC_KEY_BYTES, NETWORK).address as string

const RECIPIENT = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
const MEMO = '=:ETH.ETH:0x0000000000000000000000000000000000000001:0/1/0'

const TX_OPTS = { allowUnknownOutputs: true }

const outputScript = (address: string) => OutScript.encode(Address(NETWORK).decode(address))

const fundWallet = (address: string, values: number[]) => {
  const parents = new Map<string, string>()
  const utxos: BitcoinUtxo[] = values.map((value, n) => {
    const parent = new Transaction()
    parent.addOutput({ script: outputScript(address), amount: BigInt(value) })
    parent.addInput({
      txid: new Uint8Array(32).fill(n + 1),
      index: 0,
      finalScriptSig: new Uint8Array([0x51]),
    })
    parents.set(parent.id, parent.hex)
    return { txid: parent.id, vout: 0, value: BigInt(value) }
  })

  const getPrevTxHex = (txid: string) => {
    const parentHex = parents.get(txid)
    return parentHex ? Promise.resolve(parentHex) : Promise.reject(new Error(`unknown ${txid}`))
  }

  return { utxos, getPrevTxHex }
}

const transferArgs = (address: string, values = [100_000]) => ({
  address,
  publicKey: PUBLIC_KEY,
  ...fundWallet(address, values),
  to: RECIPIENT,
  amount: 50_000n,
  opReturnData: undefined,
  feePerByte: 5n,
})

const signAsWallet = (psbt: string): string => {
  const tx = Transaction.fromPSBT(base64.decode(psbt), TX_OPTS)
  tx.sign(PRIVATE_KEY)
  return base64.encode(tx.toPSBT())
}

const decode = (txHex: string) => Transaction.fromRaw(hex.decode(txHex), TX_OPTS)

describe('buildTransferPsbt + finalizeSignedPsbt', () => {
  it.each([
    ['native segwit', WPKH_ADDRESS],
    ['nested segwit', SH_ADDRESS],
    ['taproot', TR_ADDRESS],
    ['legacy', PKH_ADDRESS],
  ])('pays the recipient, returns change and carries the memo last (%s)', async (_, address) => {
    const built = await buildTransferPsbt({
      ...transferArgs(address, [40_000, 100_000]),
      opReturnData: MEMO,
      feePerByte: 10n,
    })

    const { txHex, txid } = finalizeSignedPsbt(signAsWallet(built.psbt))
    const tx = decode(txHex)

    expect(tx.id).toBe(txid)
    expect(tx.outputsLength).toBe(3)

    const [recipient, change, opReturn] = [0, 1, 2].map(i => tx.getOutput(i))
    expect(hex.encode(recipient.script as Uint8Array)).toBe(hex.encode(outputScript(RECIPIENT)))
    expect(recipient.amount).toBe(50_000n)
    expect(hex.encode(change.script as Uint8Array)).toBe(hex.encode(outputScript(address)))
    expect(opReturn.amount).toBe(0n)
    const [opcode, data] = Script.decode(opReturn.script as Uint8Array)
    expect(opcode).toBe('RETURN')
    expect(hex.encode(data as Uint8Array)).toBe(hex.encode(new TextEncoder().encode(MEMO)))

    const unsigned = Transaction.fromPSBT(base64.decode(built.psbt), TX_OPTS)
    expect(unsigned.fee).toBeGreaterThanOrEqual(10n * BigInt(tx.vsize))
    expect(built.signInputs).toEqual(
      Array.from({ length: tx.inputsLength }, (_, index) => ({ address, index })),
    )

    for (let index = 0; index < unsigned.inputsLength; index++) {
      const input = unsigned.getInput(index)
      expect(input.nonWitnessUtxo).toBeDefined()
      expect(input.sequence).toBe(0xfffffffd)
    }
  })

  it('builds a plain transfer without an OP_RETURN when there is no memo', async () => {
    const built = await buildTransferPsbt(transferArgs(WPKH_ADDRESS))

    const tx = decode(finalizeSignedPsbt(signAsWallet(built.psbt)).txHex)
    const scripts = Array.from({ length: tx.outputsLength }, (_, i) => tx.getOutput(i).script)
    expect(scripts.some(script => script?.[0] === 0x6a)).toBe(false)
  })

  it('accepts a psbt the wallet already finalized', async () => {
    const built = await buildTransferPsbt({ ...transferArgs(TR_ADDRESS), opReturnData: MEMO })

    const signed = Transaction.fromPSBT(base64.decode(built.psbt), TX_OPTS)
    signed.sign(PRIVATE_KEY)
    signed.finalize()

    expect(() => finalizeSignedPsbt(base64.encode(signed.toPSBT()))).not.toThrow()
  })

  it('rejects a psbt with an input the wallet did not sign', async () => {
    const built = await buildTransferPsbt(transferArgs(WPKH_ADDRESS, [30_000, 30_000]))

    const partiallySigned = Transaction.fromPSBT(base64.decode(built.psbt))
    partiallySigned.signIdx(PRIVATE_KEY, 0)

    expect(() => finalizeSignedPsbt(base64.encode(partiallySigned.toPSBT()))).toThrow(
      'Wallet did not sign input 1',
    )
  })

  it('throws when the balance cannot cover the amount and fee', async () => {
    await expect(buildTransferPsbt(transferArgs(WPKH_ADDRESS, [50_000]))).rejects.toThrow(
      'Insufficient balance',
    )
  })

  it('throws on a memo over the OP_RETURN limit', async () => {
    await expect(
      buildTransferPsbt({ ...transferArgs(WPKH_ADDRESS), opReturnData: 'x'.repeat(81) }),
    ).rejects.toThrow('over the 80 limit')
  })

  it.each([
    ['nested segwit', SH_ADDRESS],
    ['taproot', TR_ADDRESS],
  ])('throws when a %s address comes without a matching public key', async (_, address) => {
    const args = transferArgs(address)

    await expect(buildTransferPsbt({ ...args, publicKey: undefined })).rejects.toThrow('public key')
    await expect(
      buildTransferPsbt({
        ...args,
        publicKey: '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
      }),
    ).rejects.toThrow('does not match')
  })
})
