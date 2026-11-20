import { base64, hex } from '@scure/base'
import {
  Address,
  NETWORK,
  OutScript,
  p2sh,
  p2tr,
  p2wpkh,
  Script,
  selectUTXO,
  Transaction,
} from '@scure/btc-signer'

const MAX_OP_RETURN_BYTES = 80

// BIP-125 opt-in replace-by-fee, matching the app's bitcoin transfers
const RBF_SEQUENCE = 0xfffffffd

const TX_OPTS = { allowUnknownOutputs: true }

const PREV_TX_FETCH_BATCH_SIZE = 5

export type BitcoinUtxo = {
  txid: string
  vout: number
  value: bigint
}

type BuildTransferPsbtArgs = {
  address: string
  publicKey: string | undefined
  utxos: BitcoinUtxo[]
  getPrevTxHex: (txid: string) => Promise<string>
  to: string
  amount: bigint
  opReturnData: string | undefined
  feePerByte: bigint
}

type BuiltTransferPsbt = {
  psbt: string
  signInputs: { address: string; index: number }[]
}

type FinalizedTransfer = {
  txHex: string
  txid: string
}

type SpendKeys = { redeemScript?: Uint8Array; tapInternalKey?: Uint8Array }

const decodeAddress = (address: string) => {
  try {
    return Address(NETWORK).decode(address)
  } catch {
    throw new Error('Unsupported Bitcoin address type')
  }
}

const requirePublicKey = (publicKey: string | undefined): Uint8Array => {
  if (!publicKey) throw new Error('Wallet did not share the public key for its address')
  return hex.decode(publicKey)
}

const getSpendKeys = (type: string, address: string, publicKey: string | undefined): SpendKeys => {
  switch (type) {
    case 'wpkh':
    case 'pkh':
      return {}
    case 'sh': {
      const payment = p2sh(p2wpkh(requirePublicKey(publicKey), NETWORK), NETWORK)
      if (payment.address !== address) {
        throw new Error('Wallet public key does not match its p2sh address')
      }
      return { redeemScript: payment.redeemScript }
    }
    case 'tr': {
      const key = requirePublicKey(publicKey)
      const tapInternalKey = key.length === 33 ? key.slice(1) : key
      if (p2tr(tapInternalKey, undefined, NETWORK).address !== address) {
        throw new Error('Wallet public key does not match its taproot address')
      }
      return { tapInternalKey }
    }
    default:
      throw new Error('Unsupported Bitcoin address type')
  }
}

const encodeOpReturn = (opReturnData: string): Uint8Array => {
  const data = new TextEncoder().encode(opReturnData)
  if (data.length > MAX_OP_RETURN_BYTES) {
    throw new Error(`OP_RETURN data is ${data.length} bytes, over the ${MAX_OP_RETURN_BYTES} limit`)
  }

  return Script.encode(['RETURN', data])
}

export const buildTransferPsbt = async ({
  address,
  publicKey,
  utxos,
  getPrevTxHex,
  to,
  amount,
  opReturnData,
  feePerByte,
}: BuildTransferPsbtArgs): Promise<BuiltTransferPsbt> => {
  const decoded = decodeAddress(address)
  const script = OutScript.encode(decoded)
  const spendKeys = getSpendKeys(decoded.type, address, publicKey)

  const candidates = utxos.map(utxo => ({
    txid: utxo.txid,
    index: utxo.vout,
    sequence: RBF_SEQUENCE,
    witnessUtxo: { script, amount: utxo.value },
    ...spendKeys,
  }))

  const opReturnScript = opReturnData ? encodeOpReturn(opReturnData) : undefined

  const selection = selectUTXO(
    candidates,
    [{ address: to, amount }, ...(opReturnScript ? [{ script: opReturnScript, amount: 0n }] : [])],
    'default',
    {
      ...TX_OPTS,
      allowLegacyWitnessUtxo: true,
      feePerByte,
      changeAddress: address,
      network: NETWORK,
      bip69: false,
      createTx: false,
    },
  )

  if (!selection) throw new Error('Insufficient balance to cover the amount and network fee')

  const prevTxs = new Map<string, Promise<Uint8Array>>()
  const getPrevTx = (txid: string) => {
    if (!prevTxs.has(txid)) prevTxs.set(txid, getPrevTxHex(txid).then(hex.decode))
    return prevTxs.get(txid) as Promise<Uint8Array>
  }

  const withPrevTx = async ({ witnessUtxo, ...input }: (typeof selection.inputs)[number]) => {
    if (!input.txid) throw new Error('Selected input is missing its txid')
    return {
      ...input,
      ...(decoded.type !== 'pkh' && { witnessUtxo }),
      nonWitnessUtxo: await getPrevTx(hex.encode(input.txid)),
    }
  }

  const inputs: Awaited<ReturnType<typeof withPrevTx>>[] = []
  for (let start = 0; start < selection.inputs.length; start += PREV_TX_FETCH_BATCH_SIZE) {
    const batch = selection.inputs.slice(start, start + PREV_TX_FETCH_BATCH_SIZE)
    inputs.push(...(await Promise.all(batch.map(withPrevTx))))
  }

  const change = selection.change ? selection.outputs[selection.outputs.length - 1] : undefined

  const tx = new Transaction(TX_OPTS)
  inputs.forEach(input => tx.addInput(input))
  tx.addOutputAddress(to, amount, NETWORK)
  if (change) tx.addOutputAddress(address, change.amount, NETWORK)
  if (opReturnScript) tx.addOutput({ script: opReturnScript, amount: 0n })

  return {
    psbt: base64.encode(tx.toPSBT()),
    signInputs: inputs.map((_, index) => ({ address, index })),
  }
}

// Wallets differ on whether they finalize, so only the inputs still carrying signatures are finalized here
export const finalizeSignedPsbt = (signedPsbt: string): FinalizedTransfer => {
  const tx = Transaction.fromPSBT(base64.decode(signedPsbt), TX_OPTS)

  for (let index = 0; index < tx.inputsLength; index++) {
    const input = tx.getInput(index)
    if (input.finalScriptWitness?.length || input.finalScriptSig?.length) continue
    if (!input.partialSig?.length && !input.tapKeySig) {
      throw new Error(`Wallet did not sign input ${index}`)
    }
    tx.finalizeIdx(index)
  }

  return { txHex: hex.encode(tx.extract()), txid: tx.id }
}
