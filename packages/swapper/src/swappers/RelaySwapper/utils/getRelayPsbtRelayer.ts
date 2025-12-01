import * as bitcoin from '@shapeshiftoss/bitcoinjs-lib'

export const getRelayPsbtRelayer = (psbtHex: string, sellAmountCryptoBaseUnit: string) => {
  const psbtBuffer = Buffer.from(psbtHex, 'hex')
  const psbt = bitcoin.Psbt.fromBuffer(psbtBuffer)

  const outputs = psbt.txOutputs
  for (let i = 0; i < outputs.length; i++) {
    const output = outputs[i]
    const script = output.script

    try {
      const address = bitcoin.address.fromOutputScript(script)

      // Assuming the destination address is the one with the exact amount of sellAmountCryptoBaseUnit
      if (output.value === BigInt(sellAmountCryptoBaseUnit)) {
        return address
      }
    } catch (e) {
      console.error(`Could not extract address from output ${i}:`, e)
    }
  }
}
