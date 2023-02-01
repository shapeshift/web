import type { ICore } from '@walletconnect/types'
import type { IWeb3Wallet } from '@walletconnect/web3wallet'
import {
  getWalletConnectCore,
  getWalletConnectWallet,
} from 'plugins/walletConnectToDapps/walletUtils'
import { useEffect, useState } from 'react'

export const useWalletConnectWallet = () => {
  const [core, setCore] = useState<ICore>()
  const [wallet, setWallet] = useState<IWeb3Wallet>()
  useEffect(() => {
    ;(async () => {
      setCore(getWalletConnectCore())
      setWallet(await getWalletConnectWallet())
    })()
  }, [])

  return { core, wallet }
}
