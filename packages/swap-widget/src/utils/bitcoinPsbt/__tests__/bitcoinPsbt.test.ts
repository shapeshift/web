import ecc from '@bitcoinerlab/secp256k1'
import type { Signer } from '@shapeshiftoss/bitcoinjs-lib'
import {
  address as bitcoinAddress,
  crypto,
  initEccLib,
  networks,
  payments,
  Psbt,
  script as bitcoinScript,
  Transaction,
} from '@shapeshiftoss/bitcoinjs-lib'
import { describe, expect, it } from 'vitest'

import type { Utxo } from '..'
import { buildTransferPsbt, finalizeSignedPsbt } from '..'

initEccLib(ecc)

const network = networks.bitcoin

const PRIVATE_KEY = Uint8Array.from({ length: 32 }, (_, i) => (i === 31 ? 1 : 0))
const PUBLIC_KEY_BYTES = ecc.pointFromScalar(PRIVATE_KEY, true) as Uint8Array
const PUBLIC_KEY = Buffer.from(PUBLIC_KEY_BYTES).toString('hex')

const WPKH_ADDRESS = payments.p2wpkh({ pubkey: PUBLIC_KEY_BYTES, network }).address as string
const SH_ADDRESS = payments.p2sh({
  redeem: payments.p2wpkh({ pubkey: PUBLIC_KEY_BYTES, network }),
  network,
}).address as string
const TR_ADDRESS = payments.p2tr({ internalPubkey: PUBLIC_KEY_BYTES.slice(1), network })
  .address as string
const PKH_ADDRESS = payments.p2pkh({ pubkey: PUBLIC_KEY_BYTES, network }).address as string

const RECIPIENT = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
const MEMO = '=:ETH.ETH:0x0000000000000000000000000000000000000001:0/1/0'

const ecdsaSigner: Signer = {
  publicKey: PUBLIC_KEY_BYTES,
  sign: hash => ecc.sign(hash, PRIVATE_KEY),
}

const taprootSigner: Signer = (() => {
  const tweak = crypto.taggedHash('TapTweak', PUBLIC_KEY_BYTES.slice(1))
  const evenKey = PUBLIC_KEY_BYTES[0] === 3 ? ecc.privateNegate(PRIVATE_KEY) : PRIVATE_KEY
  const tweakedKey = ecc.privateAdd(evenKey, tweak) as Uint8Array
  return {
    publicKey: ecc.pointFromScalar(tweakedKey, true) as Uint8Array,
    sign: hash => ecc.sign(hash, tweakedKey),
    signSchnorr: hash => ecc.signSchnorr(hash, tweakedKey),
  }
})()

const signerFor = (address: string) => (address === TR_ADDRESS ? taprootSigner : ecdsaSigner)

const toHex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex')

const outputScript = (address: string) => bitcoinAddress.toOutputScript(address, network)

const fundWallet = (address: string, values: number[]) => {
  const parents = new Map<string, string>()
  const utxos: Utxo[] = values.map((value, n) => {
    const parent = new Transaction()
    parent.addInput(new Uint8Array(32).fill(n + 1), 0, 0xffffffff, Uint8Array.from([0x51]))
    parent.addOutput(outputScript(address), BigInt(value))
    parents.set(parent.getId(), parent.toHex())
    return { txid: parent.getId(), vout: 0, value: BigInt(value) }
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

const signAsWallet = (psbtBase64: string, address: string): string => {
  const psbt = Psbt.fromBase64(psbtBase64, { network })
  psbt.signAllInputs(signerFor(address))
  return psbt.toBase64()
}

describe('buildTransferPsbt + finalizeSignedPsbt', () => {
  it.each([
    ['native segwit', WPKH_ADDRESS],
    ['nested segwit', SH_ADDRESS],
    ['taproot', TR_ADDRESS],
    ['legacy', PKH_ADDRESS],
  ])('pays the recipient, returns change and carries the memo last (%s)', async (_, address) => {
    const args = {
      ...transferArgs(address, [40_000, 100_000]),
      opReturnData: MEMO,
      feePerByte: 10n,
    }
    const built = await buildTransferPsbt(args)

    const { txHex, txid } = finalizeSignedPsbt(signAsWallet(built.psbt, address))
    const tx = Transaction.fromHex(txHex)

    expect(tx.getId()).toBe(txid)
    expect(tx.outs).toHaveLength(3)

    const [recipient, change, opReturn] = tx.outs
    expect(toHex(recipient.script)).toBe(toHex(outputScript(RECIPIENT)))
    expect(recipient.value).toBe(50_000n)
    expect(toHex(change.script)).toBe(toHex(outputScript(address)))
    expect(opReturn.value).toBe(0n)
    const [opcode, data] = bitcoinScript.decompile(opReturn.script) ?? []
    expect(opcode).toBe(bitcoinScript.OPS.OP_RETURN)
    expect(toHex(data as Uint8Array)).toBe(toHex(new TextEncoder().encode(MEMO)))

    const unsigned = Psbt.fromBase64(built.psbt, { network })
    const inputTotal = unsigned.txInputs.reduce((sum, { hash }) => {
      const txid = toHex(Uint8Array.from(hash).reverse())
      return sum + (args.utxos.find(utxo => utxo.txid === txid)?.value ?? 0n)
    }, 0n)
    const outputTotal = tx.outs.reduce((sum, { value }) => sum + value, 0n)
    expect(inputTotal - outputTotal).toBeGreaterThanOrEqual(10n * BigInt(tx.virtualSize()))
    expect(built.signInputs).toEqual(
      Array.from({ length: tx.ins.length }, (_, index) => ({ address, index })),
    )

    unsigned.data.inputs.forEach((input, index) => {
      expect(input.nonWitnessUtxo).toBeDefined()
      expect(unsigned.txInputs[index].sequence).toBe(0xfffffffd)
    })
  })

  it('builds a plain transfer without an OP_RETURN when there is no memo', async () => {
    const built = await buildTransferPsbt(transferArgs(WPKH_ADDRESS))

    const tx = Transaction.fromHex(finalizeSignedPsbt(signAsWallet(built.psbt, WPKH_ADDRESS)).txHex)
    expect(tx.outs.some(({ script }) => script[0] === bitcoinScript.OPS.OP_RETURN)).toBe(false)
  })

  it('accepts a psbt the wallet already finalized', async () => {
    const built = await buildTransferPsbt({ ...transferArgs(TR_ADDRESS), opReturnData: MEMO })

    const signed = Psbt.fromBase64(signAsWallet(built.psbt, TR_ADDRESS), { network })
    signed.finalizeAllInputs()

    expect(() => finalizeSignedPsbt(signed.toBase64())).not.toThrow()
  })

  it('rejects a psbt with an input the wallet did not sign', async () => {
    const built = await buildTransferPsbt(transferArgs(WPKH_ADDRESS, [30_000, 30_000]))

    const partiallySigned = Psbt.fromBase64(built.psbt, { network })
    partiallySigned.signInput(0, ecdsaSigner)

    expect(() => finalizeSignedPsbt(partiallySigned.toBase64())).toThrow(
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
