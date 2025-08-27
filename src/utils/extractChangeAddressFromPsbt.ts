import * as bitcoin from '@shapeshiftoss/bitcoinjs-lib'

export const extractChangeAddressFromPsbt = (
  psbtHex: string,
  relayAddress: string,
  sellAmountCryptoBaseUnit: string,
): string | null => {
  try {
    const psbtBuffer = Buffer.from(psbtHex, 'hex')
    const psbt = bitcoin.Psbt.fromBuffer(new Uint8Array(psbtBuffer))

    const outputs = psbt.txOutputs
    const sellAmount = BigInt(sellAmountCryptoBaseUnit)

    for (let i = 0; i < outputs.length; i++) {
      const output = outputs[i]
      const script = output.script

      try {
        const address = bitcoin.address.fromOutputScript(script)

        // Change address is the output that:
        // 1. Is not the relay address (destination for swap)
        // 2. Is not the exact sell amount (that goes to relay)
        // 3. Has a valid address (excludes OP_RETURN outputs)
        if (address !== relayAddress && output.value !== sellAmount) {
          return address
        }
      } catch (e) {
        // Skip outputs that can't be decoded to addresses (like OP_RETURN)
        continue
      }
    }

    return null // No change output found
  } catch (error) {
    console.error('Failed to extract change address from PSBT:', error)
    return null
  }
}
