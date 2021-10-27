import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { BIP32Params, NetworkTypes } from '@shapeshiftoss/types'
import React, { useContext } from 'react'
import { getAssetService } from 'lib/assetService'

export interface UtxoConfigContextProps {
  getUtxoData: (chain: string) => { bip32Params: BIP32Params; scriptType: BTCInputScriptType }
  setUtxoData: (chain: string, scriptType: BTCInputScriptType) => void
}

export const UtxoConfigContext = React.createContext<UtxoConfigContextProps>({
  getUtxoData: () => ({
    bip32Params: { purpose: 49, coinType: 0, accountNumber: 0 },
    scriptType: BTCInputScriptType.SpendP2SHWitness
  }),
  setUtxoData: () => {}
})

export const UtxoConfigProvider: React.FC = ({ children }) => {
  const [configData, setConfigData] = React.useState<any>({
    BTC: {
      bip32Params: { purpose: 49, coinType: 0, accountNumber: 0 },
      scriptType: BTCInputScriptType.SpendP2SHWitness
    }
  })

  const getUtxoData = (chain: string) => {
    if (!configData[chain]) return {}
    return configData[chain]
  }

  const setUtxoData = async (symbol: string, scriptType: BTCInputScriptType) => {
    const service = await getAssetService()
    const assetData = service?.byNetwork(NetworkTypes.MAINNET)

    const asset = assetData.find(asset => asset.symbol === symbol)

    let purpose
    if (scriptType === BTCInputScriptType.SpendP2SHWitness) purpose = 49
    else if (scriptType === BTCInputScriptType.SpendAddress) purpose = 44
    else if (scriptType === BTCInputScriptType.SpendWitness) purpose = 84
    else throw new Error('invalid script type')

    const chainSpecificData = {
      bip32Params: { purpose, coinType: asset?.slip44, accountNumber: 0 },
      scriptType
    }

    setConfigData({ ...configData, [symbol]: chainSpecificData })
  }

  return (
    <UtxoConfigContext.Provider
      value={{
        getUtxoData,
        setUtxoData
      }}
    >
      {children}
    </UtxoConfigContext.Provider>
  )
}

export const useUtxoConfig = (): UtxoConfigContextProps =>
  useContext(UtxoConfigContext as React.Context<UtxoConfigContextProps>)
