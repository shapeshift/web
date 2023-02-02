import type { ICore } from '@walletconnect/types'
import type { IWeb3Wallet } from '@walletconnect/web3wallet'
import { getWalletConnectCore, getWalletConnectWallet } from 'plugins/walletConnectV2/walletUtils'
import { useEffect, useState } from 'react'

export const useWalletConnectWallet = () => {
  const [core, setCore] = useState<ICore>()
  const [web3wallet, setWeb3wallet] = useState<IWeb3Wallet>()
  useEffect(() => {
    ;(async () => {
      setCore(getWalletConnectCore())
      setWeb3wallet(await getWalletConnectWallet())
    })()
  }, [])

  return { core, web3wallet }
}
