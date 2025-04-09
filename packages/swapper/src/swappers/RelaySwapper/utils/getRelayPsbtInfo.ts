import * as bitcoin from '@shapeshiftoss/bitcoinjs-lib'

export const getRelayPsbtInfo = (psbtHex: string, sellAmountCryptoBaseUnit: string) => {
  const psbtBuffer = Buffer.from(psbtHex, 'hex')
  const psbt = bitcoin.Psbt.fromBuffer(new Uint8Array(psbtBuffer))

  const result: {
    destination: string | undefined
    opReturnData: string | undefined
  } = {
    destination: undefined,
    opReturnData: undefined,
  }

  const outputs = psbt.txOutputs
  for (let i = 0; i < outputs.length; i++) {
    const output = outputs[i]
    const script = output.script

    if (script.length > 0 && script[0] === bitcoin.opcodes.OP_RETURN) {
      const dataLength = script[1]
      const data = script.slice(2, 2 + dataLength)
      result.opReturnData = data.toString()
      continue
    }

    try {
      const address = bitcoin.address.fromOutputScript(script)

      if (output.value === BigInt(sellAmountCryptoBaseUnit)) {
        result.destination = address
      }
    } catch (e) {
      console.error(`Could not extract address from output ${i}:`, e)
    }
  }

  return result
}
