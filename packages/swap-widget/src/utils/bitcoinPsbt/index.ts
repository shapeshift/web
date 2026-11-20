import ecc from '@bitcoinerlab/secp256k1'
import type { Network } from '@shapeshiftoss/bitcoinjs-lib'
import {
  address as bitcoinAddress,
  initEccLib,
  networks,
  payments,
  Psbt,
} from '@shapeshiftoss/bitcoinjs-lib'
import coinSelect from 'coinselect'

import type {
  AddressType,
  BuildTransferPsbtArgs,
  BuiltTransferPsbt,
  FinalizedTransfer,
  SpendData,
} from './types'

export type * from './types'

const MAX_OP_RETURN_BYTES = 80

// BIP-125 opt-in replace-by-fee, matching the app's bitcoin transfers
const RBF_SEQUENCE = 0xfffffffd

const PREV_TX_FETCH_BATCH_SIZE = 5

const getAddressType = (address: string, network: Network): AddressType => {
  try {
    const { version, data, prefix } = bitcoinAddress.fromBech32(address)
    if (prefix === network.bech32 && version === 0 && data.length === 20) return 'wpkh'
    if (prefix === network.bech32 && version === 1 && data.length === 32) return 'tr'
  } catch {
    try {
      const { version } = bitcoinAddress.fromBase58Check(address)
      if (version === network.pubKeyHash) return 'pkh'
      if (version === network.scriptHash) return 'sh'
    } catch {}
  }
  throw new Error('Unsupported Bitcoin address type')
}

const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from(hex.match(/.{2}/g) ?? [], byte => parseInt(byte, 16))

const decodePublicKey = (publicKey: string | undefined): Uint8Array => {
  if (!publicKey) throw new Error('Wallet did not share the public key for its address')
  return hexToBytes(publicKey)
}

const getSpendData = (
  type: AddressType,
  address: string,
  publicKey: string | undefined,
  network: Network,
): SpendData => {
  switch (type) {
    case 'wpkh':
    case 'pkh':
      return {}
    case 'sh': {
      const redeem = payments.p2wpkh({ pubkey: decodePublicKey(publicKey), network })
      const payment = payments.p2sh({ redeem, network })
      if (payment.address !== address) {
        throw new Error('Wallet public key does not match its p2sh address')
      }
      return { redeemScript: redeem.output }
    }
    case 'tr': {
      const key = decodePublicKey(publicKey)
      const tapInternalKey = key.length === 33 ? key.slice(1) : key
      if (payments.p2tr({ internalPubkey: tapInternalKey, network }).address !== address) {
        throw new Error('Wallet public key does not match its taproot address')
      }
      return { tapInternalKey }
    }
    default:
      throw new Error('Unsupported Bitcoin address type')
  }
}

const encodeOpReturn = (opReturnData: string): Uint8Array => {
  const data = Uint8Array.from(new TextEncoder().encode(opReturnData))
  if (data.length > MAX_OP_RETURN_BYTES) {
    throw new Error(`OP_RETURN data is ${data.length} bytes, over the ${MAX_OP_RETURN_BYTES} limit`)
  }

  const { output } = payments.embed({ data: [data] })
  if (!output) throw new Error('Unable to build the OP_RETURN script')
  return output
}

const fetchPrevTxs = async (
  txids: string[],
  getPrevTxHex: (txid: string) => Promise<string>,
): Promise<Map<string, Uint8Array>> => {
  const uniqueTxids = [...new Set(txids)]
  const prevTxs = new Map<string, Uint8Array>()

  for (let start = 0; start < uniqueTxids.length; start += PREV_TX_FETCH_BATCH_SIZE) {
    const batch = uniqueTxids.slice(start, start + PREV_TX_FETCH_BATCH_SIZE)
    const hexes = await Promise.all(batch.map(getPrevTxHex))
    batch.forEach((txid, index) => prevTxs.set(txid, hexToBytes(hexes[index])))
  }

  return prevTxs
}

export const buildTransferPsbt = async ({
  network = networks.bitcoin,
  address,
  publicKey,
  utxos,
  getPrevTxHex,
  to,
  amount,
  opReturnData,
  feePerByte,
}: BuildTransferPsbtArgs): Promise<BuiltTransferPsbt> => {
  initEccLib(ecc)

  const type = getAddressType(address, network)
  const script = bitcoinAddress.toOutputScript(address, network)
  const spendData = getSpendData(type, address, publicKey, network)
  const opReturnScript = opReturnData ? encodeOpReturn(opReturnData) : undefined

  const selection = coinSelect(
    utxos.map(utxo => ({ ...utxo, value: Number(utxo.value) })),
    [
      { address: to, value: Number(amount) },
      ...(opReturnScript ? [{ script: opReturnScript, value: 0 }] : []),
    ],
    Number(feePerByte),
  )

  if (!selection.inputs || !selection.outputs) {
    throw new Error('Insufficient balance to cover the amount and network fee')
  }

  const change = selection.outputs.find(output => !output.address && !output.script)
  const prevTxs = await fetchPrevTxs(
    selection.inputs.map(input => input.txid),
    getPrevTxHex,
  )

  const psbt = new Psbt({ network })

  selection.inputs.forEach(input => {
    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      sequence: RBF_SEQUENCE,
      nonWitnessUtxo: prevTxs.get(input.txid),
      ...(type !== 'pkh' && { witnessUtxo: { script, value: BigInt(input.value) } }),
      ...spendData,
    })
  })

  psbt.addOutput({ address: to, value: amount })
  if (change?.value) psbt.addOutput({ address, value: BigInt(change.value) })
  if (opReturnScript) psbt.addOutput({ script: opReturnScript, value: 0n })

  return {
    psbt: psbt.toBase64(),
    signInputs: selection.inputs.map((_, index) => ({ address, index })),
  }
}

// Wallets differ on whether they finalize, so only the inputs still carrying signatures are finalized here
export const finalizeSignedPsbt = (
  signedPsbt: string,
  network: Network = networks.bitcoin,
): FinalizedTransfer => {
  initEccLib(ecc)

  const psbt = Psbt.fromBase64(signedPsbt, { network })

  psbt.data.inputs.forEach((input, index) => {
    if (input.finalScriptWitness?.length || input.finalScriptSig?.length) return
    if (!input.partialSig?.length && !input.tapKeySig) {
      throw new Error(`Wallet did not sign input ${index}`)
    }
    psbt.finalizeInput(index)
  })

  const tx = psbt.extractTransaction()
  return { txHex: tx.toHex(), txid: tx.getId() }
}
