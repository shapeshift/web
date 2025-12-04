import type { AssetId } from '@shapeshiftoss/caip'
import { zecAssetId } from '@shapeshiftoss/caip'
import type * as unchained from '@shapeshiftoss/unchained-client'
import coinSelect from 'coinselect'
import split from 'coinselect/split'

const ZCASH_MARGINAL_FEE = 5000
const ZCASH_GRACE_ACTIONS = 2

export type UTXOSelectInput = {
  utxos: unchained.bitcoin.Utxo[]
  from?: string
  to: string
  value: string
  satoshiPerByte: string
  opReturnData?: string
  sendMax: boolean
  assetId: AssetId
}

type SanitizedUTXO = Omit<unchained.bitcoin.Utxo, 'value'> & { value: number }

// convert number to hex and ensure there are two characters per byte
const numberToHex = (num: number) => {
  const hex = num.toString(16)
  if (hex.length % 2 === 0) return hex
  return '0' + hex
}

/**
 * Returns necessary utxo inputs & outputs for a desired tx at a given fee with OP_RETURN data considered if provided
 *
 * _opReturnData is filtered out of the return payload as it is added during transaction signing_
 */
export const utxoSelect = (input: UTXOSelectInput) => {
  const utxos = input.utxos.reduce<SanitizedUTXO[]>((acc, utxo) => {
    const sanitizedUtxo = { ...utxo, value: Number(utxo.value) }

    // If input contains a `from` param, the intent is to only keep the UTXOs from that address
    // so we can ensure the send address is the one we want
    // This doesn't do any further checks, so error-handling should be done by the caller e.g `buildSendTransaction` callsites
    if (!input.from || utxo.address === input.from) {
      acc.push(sanitizedUtxo)
    }
    return acc
  }, [])

  const extraOutput = (() => {
    if (!input.opReturnData) return []

    const opReturnData = Buffer.from(input.opReturnData)
    const opReturnOpCode = Buffer.from('6a', 'hex')
    const opReturnDataLength = Buffer.from(numberToHex(opReturnData.length), 'hex')

    const output: Output = {
      value: 0,
      script: Buffer.concat([opReturnOpCode, opReturnDataLength, opReturnData]).toString('utf-8'),
    }

    return [output]
  })()

  const result = (() => {
    if (input.assetId === zecAssetId) {
      return coinSelectZcash(input, utxos, extraOutput)
    }

    if (input.sendMax) {
      const outputs = [{ address: input.to }, ...extraOutput]
      return split<SanitizedUTXO>(utxos, outputs, Number(input.satoshiPerByte))
    }

    const outputs = [{ value: Number(input.value), address: input.to }, ...extraOutput]
    return coinSelect<SanitizedUTXO>(utxos, outputs, Number(input.satoshiPerByte))
  })()

  // Finds the change output index (if present), so we can replace it with the from address in case from is provided
  const changeOutputIndex = (result.outputs ?? []).findIndex(
    o => o.value && !o.address && !o.script,
  )
  if (input.from && result.outputs && changeOutputIndex !== -1) {
    // If input contains a `from` param, inputs will be filtered to only keep UTXOs from that address
    // The change address will be set to this from address, so that it can be reused
    // Reusing addresses is an xpub antipattern and totally voids UTXO privacy guarantees, thus input.from should only be used
    // when dealing with destinations that expect address reuse e.g THORChain savers
    const { value } = result.outputs[changeOutputIndex]
    result.outputs[changeOutputIndex] = { address: input.from, value }
  }

  return { ...result, outputs: result.outputs?.filter(o => !o.script) }
}

const calculateZip317Fee = (numInputs: number, numOutputs: number): number => {
  const logicalActions = Math.max(numInputs, numOutputs)
  return ZCASH_MARGINAL_FEE * Math.max(ZCASH_GRACE_ACTIONS, logicalActions)
}

const coinSelectZcash = (
  input: UTXOSelectInput,
  utxos: SanitizedUTXO[],
  extraOutput: Output[],
): CoinSelectResult<
  Omit<SanitizedUTXO, 'value'> & {
    value: number
  }
> => {
  if (input.sendMax) {
    const numOutputs = 1 + (input.opReturnData ? 1 : 0)
    const feeWithoutChange = calculateZip317Fee(utxos.length, numOutputs)
    const totalIn = utxos.reduce((sum, { value }) => sum + value, 0)
    const remainder = totalIn - feeWithoutChange

    if (remainder <= 0) return { fee: 0 }

    const outputs: Output[] = [{ address: input.to, value: remainder }, ...extraOutput]

    return { inputs: utxos, outputs, fee: feeWithoutChange }
  }

  let totalIn = 0
  const inputs: SanitizedUTXO[] = []

  for (const utxo of [...utxos].sort((a, b) => b.value - a.value)) {
    inputs.push(utxo)
    totalIn += utxo.value

    const numOutputs = 2 + (input.opReturnData ? 1 : 0)
    const feeWithChange = calculateZip317Fee(inputs.length, numOutputs)

    if (totalIn >= Number(input.value) + feeWithChange) {
      const remainder = totalIn - Number(input.value) - feeWithChange

      const outputs: Output[] = [
        { address: input.to, value: Number(input.value) },
        { value: remainder },
        ...extraOutput,
      ]

      return { inputs, outputs, fee: feeWithChange }
    }
  }

  return { fee: 0 }
}
