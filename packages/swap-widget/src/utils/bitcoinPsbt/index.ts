import ecc from '@bitcoinerlab/secp256k1'
import type { Network } from '@shapeshiftoss/bitcoinjs-lib'
import {
  address as bitcoinAddress,
  initEccLib,
  networks,
  payments,
  Psbt,
  toXOnly,
} from '@shapeshiftoss/bitcoinjs-lib'

import { getDustLimit, selectUtxos } from './selectUtxos'
import type {
  AddressType,
  BuildTransferPsbtArgs,
  BuiltTransferPsbt,
  FinalizedTransfer,
  FinalizeSignedPsbtArgs,
  SpendData,
} from './types'

export type {
  BuildTransferPsbtArgs,
  BuiltTransferPsbt,
  FinalizedTransfer,
  FinalizeSignedPsbtArgs,
  Utxo,
} from './types'

initEccLib(ecc)

const MAX_OP_RETURN_BYTES = 80
const RBF_SEQUENCE = 0xfffffffd
const PREV_TX_FETCH_BATCH_SIZE = 5

const getAddressType = (address: string, network: Network): AddressType => {
  if (address.toLowerCase().startsWith(`${network.bech32}1`)) {
    const { version, data } = bitcoinAddress.fromBech32(address)
    if (version === 0 && data.length === 20) return 'wpkh'
    if (version === 1 && data.length === 32) return 'tr'
  } else {
    const { version } = bitcoinAddress.fromBase58Check(address)
    if (version === network.pubKeyHash) return 'pkh'
    if (version === network.scriptHash) return 'sh'
  }

  throw new Error('Unsupported address type')
}

const bytesEqual = (a: Uint8Array | undefined, b: Uint8Array | undefined): boolean =>
  !!a && !!b && a.length === b.length && a.every((byte, index) => byte === b[index])

const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from(hex.match(/.{2}/g) ?? [], byte => parseInt(byte, 16))

const decodePublicKey = (publicKey: string | undefined): Uint8Array => {
  if (!publicKey) {
    throw new Error('A public key is required to spend from p2sh and taproot addresses')
  }

  return hexToBytes(publicKey)
}

const getSpendData = (
  type: AddressType,
  script: Uint8Array,
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

      if (!bytesEqual(payment.output, script)) {
        throw new Error('Public key does not match the p2sh address')
      }

      return { redeemScript: redeem.output }
    }
    case 'tr': {
      const tapInternalKey = toXOnly(decodePublicKey(publicKey))

      if (!bytesEqual(payments.p2tr({ internalPubkey: tapInternalKey, network }).output, script)) {
        throw new Error('Public key does not match the taproot address')
      }

      return { tapInternalKey }
    }
    default:
      throw new Error('Unsupported address type')
  }
}

const encodeOpReturn = (opReturnData: string): Uint8Array => {
  const data = new TextEncoder().encode(opReturnData)

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
  const type = getAddressType(address, network)
  const script = bitcoinAddress.toOutputScript(address, network)
  const spendData = getSpendData(type, script, publicKey, network)
  const recipientScript = bitcoinAddress.toOutputScript(to, network)
  const opReturnScript = opReturnData ? encodeOpReturn(opReturnData) : undefined

  if (amount < getDustLimit(recipientScript)) {
    throw new Error(`Amount is below the ${getDustLimit(recipientScript)} sat dust limit`)
  }

  const { inputs, change } = selectUtxos({
    type,
    utxos,
    outputs: [
      { script: recipientScript, value: amount },
      ...(opReturnScript ? [{ script: opReturnScript, value: 0n }] : []),
    ],
    changeScript: script,
    feePerByte,
  })

  // Taproot signatures commit to every input amount, so signers don't need the parent tx
  const prevTxs =
    type === 'tr'
      ? undefined
      : await fetchPrevTxs(
          inputs.map(input => input.txid),
          getPrevTxHex,
        )

  const psbt = new Psbt({ network })

  inputs.forEach(input => {
    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      sequence: RBF_SEQUENCE,
      ...(prevTxs && { nonWitnessUtxo: prevTxs.get(input.txid) }),
      ...(type !== 'pkh' && { witnessUtxo: { script, value: input.value } }),
      ...spendData,
    })
  })

  psbt.addOutput({ script: recipientScript, value: amount })
  if (change) psbt.addOutput({ script, value: change })
  if (opReturnScript) psbt.addOutput({ script: opReturnScript, value: 0n })

  return {
    psbt: psbt.toBase64(),
    signInputs: inputs.map((_, index) => ({ address, index })),
  }
}

const assertSameTransaction = (built: Psbt, signed: Psbt): void => {
  const sameInputs =
    built.txInputs.length === signed.txInputs.length &&
    built.txInputs.every(
      (input, index) =>
        bytesEqual(input.hash, signed.txInputs[index].hash) &&
        input.index === signed.txInputs[index].index,
    )

  const sameOutputs =
    built.txOutputs.length === signed.txOutputs.length &&
    built.txOutputs.every(
      (output, index) =>
        bytesEqual(output.script, signed.txOutputs[index].script) &&
        output.value === signed.txOutputs[index].value,
    )

  if (!sameInputs || !sameOutputs) {
    throw new Error('Wallet changed the transaction while signing')
  }
}

export const finalizeSignedPsbt = ({
  builtPsbt,
  signedPsbt,
  network = networks.bitcoin,
}: FinalizeSignedPsbtArgs): FinalizedTransfer => {
  const psbt = Psbt.fromBase64(signedPsbt, { network })

  assertSameTransaction(Psbt.fromBase64(builtPsbt, { network }), psbt)

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
