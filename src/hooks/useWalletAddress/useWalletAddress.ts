import { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'

export function useWalletAddress(defaultAddress: string = ''): string {
  const { state: walletState } = useWallet()
  const chainAdapterManager = getChainAdapterManager()
  const [address, setAddress] = useState<string>(defaultAddress)
  const chainAdapter = chainAdapterManager.get(KnownChainIds.EthereumMainnet)

  useEffect(() => {
    ;(async () => {
      try {
        if (!(walletState.wallet && chainAdapter)) return
        const userAddress = await chainAdapter.getAddress({ wallet: walletState.wallet })
        setAddress(userAddress)
      } catch (error) {
        // TODO: handle client side errors
        console.error('useWalletAddress error:', error)
      }
    })()
  }, [chainAdapter, walletState.wallet])

  return address
}
