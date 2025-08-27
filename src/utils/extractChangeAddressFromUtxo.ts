import type { BTCSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { BTCOutputAddressType, supportsBTC } from '@shapeshiftoss/hdwallet-core'

export const extractChangeAddressFromUtxo = async (
  txToSign: BTCSignTx,
  wallet: HDWallet,
): Promise<string | null> => {
  try {
    if (!supportsBTC(wallet)) {
      return null
    }

    // Find change outputs in the transaction
    const changeOutputs = txToSign.outputs.filter(
      (output: any) => output.addressType === BTCOutputAddressType.Change && output.addressNList,
    )

    if (changeOutputs.length === 0) {
      return null // No change output found
    }

    // Use the first change output (there should typically be only one)
    const changeOutput = changeOutputs[0]

    if (!changeOutput.addressNList) {
      return null
    }

    // Derive the actual address from the addressNList using the wallet
    const address = await wallet.btcGetAddress({
      addressNList: changeOutput.addressNList,
      coin: txToSign.coin,
      scriptType: changeOutput.scriptType as any,
      showDisplay: false,
    })

    return address || null
  } catch (error) {
    console.error('Failed to extract change address from UTXO transaction:', error)
    return null
  }
}
