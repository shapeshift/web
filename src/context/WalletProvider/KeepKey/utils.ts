import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'

export const isKeepKeyWallet = (wallet: HDWallet | null): wallet is KeepKeyHDWallet => {
  return (wallet as KeepKeyHDWallet)?._isKeepKey
}
