import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { BIP32Params } from '@shapeshiftoss/types'
import React, { useContext } from 'react'

export const SpendP2SHWitness = {
  bip32Params: { purpose: 49, coinType: 0, accountNumber: 0 },
  scriptType: BTCInputScriptType.SpendP2SHWitness
}
export const SpendAddress = {
  bip32Params: { purpose: 44, coinType: 0, accountNumber: 0 },
  scriptType: BTCInputScriptType.SpendAddress
}
export const SpendWitness = {
  bip32Params: { purpose: 84, coinType: 0, accountNumber: 0 },
  scriptType: BTCInputScriptType.SpendWitness
}

export interface DataProps {
  bip32Params: BIP32Params
  scriptType: BTCInputScriptType
}

export interface UtxoConfigContextProps {
  utxoDataState: {
    utxoData: DataProps
    setUtxoData: React.Dispatch<React.SetStateAction<DataProps>>
  }
}

export const UtxoConfigContext = React.createContext<UtxoConfigContextProps>({
  utxoDataState: {
    utxoData: SpendP2SHWitness,
    setUtxoData: () => {}
  }
})

export const UtxoConfigProvider: React.FC = ({ children }) => {
  const [utxoData, setUtxoData] = React.useState<DataProps>(SpendP2SHWitness)

  if (!utxoData) throw new Error('utxoData or setUtxoData is undefined')
  if (!setUtxoData) throw new Error('!setUtxoData or setUtxoData is undefined')
  return (
    <UtxoConfigContext.Provider
      value={{
        utxoDataState: { utxoData, setUtxoData }
      }}
    >
      {children}
    </UtxoConfigContext.Provider>
  )
}

export const useUtxoConfig = (): UtxoConfigContextProps =>
  useContext(UtxoConfigContext as React.Context<UtxoConfigContextProps>)
