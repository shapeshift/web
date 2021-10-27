import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'

export const bip32FromScript = (scriptType: BTCInputScriptType | undefined) => {
  if (scriptType === BTCInputScriptType.SpendP2SHWitness)
    return { purpose: 49, coinType: 0, accountNumber: 0 }
  else if (scriptType === BTCInputScriptType.SpendAddress)
    return { purpose: 44, coinType: 0, accountNumber: 0 }
  else if (scriptType === BTCInputScriptType.SpendWitness)
    return { purpose: 84, coinType: 0, accountNumber: 0 }
  else if (!scriptType) return undefined
  else throw new Error('Unsupported script type')
}
