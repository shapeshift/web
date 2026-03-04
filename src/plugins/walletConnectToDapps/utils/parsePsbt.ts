import { address as btcAddress, Psbt } from '@shapeshiftoss/bitcoinjs-lib'

export type ParsedInput = {
  txid: string
  vout: number
  address: string | null
  value: string
}

export type ParsedOutput = {
  address: string | null
  value: string
}

export type ParsedPsbt = {
  inputs: ParsedInput[]
  outputs: ParsedOutput[]
  version: number
  locktime: number
}

export const parsePsbt = (psbtBase64: string): ParsedPsbt | null => {
  try {
    const psbt = Psbt.fromBase64(psbtBase64)

    const inputs: ParsedInput[] = psbt.txInputs.map((txInput, i) => {
      const psbtInput = psbt.data.inputs[i]
      const witnessUtxo = psbtInput.witnessUtxo
      const txid = Buffer.from(txInput.hash).reverse().toString('hex')

      let inputAddress: string | null = null
      if (witnessUtxo) {
        try {
          inputAddress = btcAddress.fromOutputScript(witnessUtxo.script)
        } catch {
          // non-standard script
        }
      }

      return {
        txid,
        vout: txInput.index,
        address: inputAddress,
        value: witnessUtxo ? witnessUtxo.value.toString() : '0',
      }
    })

    const outputs: ParsedOutput[] = psbt.txOutputs.map(txOutput => ({
      address: txOutput.address ?? null,
      value: txOutput.value.toString(),
    }))

    return { inputs, outputs, version: psbt.version, locktime: psbt.locktime }
  } catch {
    return null
  }
}
