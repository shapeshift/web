import * as unchained from '@shapeshiftoss/unchained-client'
import coinSelect from 'coinselect'
import split from 'coinselect/split'

export type UTXOSelectInput = {
  utxos: unchained.bitcoin.Utxo[]
  from?: string
  to: string
  value: string
  satoshiPerByte: string
  opReturnData?: string
  sendMax: boolean
}

type SanitizedUTXO = Omit<unchained.bitcoin.Utxo, 'value'> & { value: number }

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
    if (!input.from || (input.from && utxo.address === input.from)) {
      acc.push(sanitizedUtxo)
    }
    return acc
  }, [])

  const extraOutput = input.opReturnData ? [{ value: 0, script: input.opReturnData }] : []

  const result = (() => {
    if (input.sendMax) {
      const outputs = [{ address: input.to }, ...extraOutput]
      return split<unchained.bitcoin.Utxo>(utxos, outputs, Number(input.satoshiPerByte))
    }

    const outputs = [{ value: Number(input.value), address: input.to }, ...extraOutput]
    return coinSelect<unchained.bitcoin.Utxo>(utxos, outputs, Number(input.satoshiPerByte))
  })()

  return { ...result, outputs: result.outputs?.filter((o) => !o.script) }
}
