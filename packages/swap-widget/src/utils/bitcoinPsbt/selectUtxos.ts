import coinSelect from 'coinselect'

import type { AddressType, Utxo } from './types'

// Bitcoin Core's default -dustrelayfee, in sats per vbyte
const DUST_RELAY_FEE = 3n

// Spend sizes Bitcoin Core uses when pricing dust, in bytes
const DUST_SPEND_BYTES = { legacy: 148n, witness: 67n }

// Signed input vbytes, rounded up to also cover the segwit marker
const INPUT_VBYTES: Record<AddressType, number> = {
  pkh: 148,
  sh: 92,
  wpkh: 69,
  tr: 58,
}

// coinselect sizes an input as 41 bytes plus its script length, so a blank script of the remainder sets its size
const COINSELECT_INPUT_BASE_BYTES = 41

// Version, locktime and the input and output counts
const TX_OVERHEAD_BYTES = 10

const outputSize = (script: Uint8Array): number => 8 + 1 + script.length

const isWitnessProgram = (script: Uint8Array): boolean => {
  const [version, pushLength] = script
  const isVersionOpcode = version === 0x00 || (version >= 0x51 && version <= 0x60)
  return (
    isVersionOpcode && script.length >= 4 && script.length <= 42 && pushLength === script.length - 2
  )
}

export const getDustLimit = (script: Uint8Array): bigint => {
  const spendBytes = isWitnessProgram(script) ? DUST_SPEND_BYTES.witness : DUST_SPEND_BYTES.legacy
  return (BigInt(outputSize(script)) + spendBytes) * DUST_RELAY_FEE
}

export type UtxoSelection = {
  inputs: Utxo[]
  change: bigint
}

type SelectUtxosArgs = {
  type: AddressType
  utxos: Utxo[]
  outputs: { script: Uint8Array; value: bigint }[]
  changeScript: Uint8Array
  feePerByte: bigint
}

export const selectUtxos = ({
  type,
  utxos,
  outputs,
  changeScript,
  feePerByte,
}: SelectUtxosArgs): UtxoSelection => {
  const sizingScript = new Uint8Array(INPUT_VBYTES[type] - COINSELECT_INPUT_BASE_BYTES)

  const selection = coinSelect(
    utxos.map(utxo => ({ utxo, value: Number(utxo.value), script: sizingScript })),
    outputs.map(({ script, value }) => ({ script, value: Number(value) })),
    Number(feePerByte),
  )

  if (!selection.inputs) {
    throw new Error('Insufficient balance to cover the amount and network fee')
  }

  const inputs = selection.inputs.map(({ utxo }) => utxo)

  // coinselect drops change under 148 bytes x fee rate, so change is recomputed and kept down to the dust limit
  const vbytesWithChange =
    TX_OVERHEAD_BYTES +
    inputs.length * INPUT_VBYTES[type] +
    [...outputs.map(({ script }) => script), changeScript].reduce(
      (sum, script) => sum + outputSize(script),
      0,
    )
  const change =
    inputs.reduce((sum, { value }) => sum + value, 0n) -
    outputs.reduce((sum, { value }) => sum + value, 0n) -
    BigInt(vbytesWithChange) * feePerByte

  return { inputs, change: change >= getDustLimit(changeScript) ? change : 0n }
}
