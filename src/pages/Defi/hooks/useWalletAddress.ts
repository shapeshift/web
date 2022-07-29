import { useEffect, useState } from 'react'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'

export function useWalletAddress(): string {
	const [userAddress, setUserAddress] = useState<string>('')
	const chainAdapterManager = useChainAdapters()
	const { state: walletState } = useWallet()
	
	useEffect(() => {
	  ;(async () => {
	    try {
	      const chainAdapter = await chainAdapterManager.get(KnownChainIds.EthereumMainnet)
	      if (!(walletState.wallet && chainAdapter)) return
	      const userAddress = await chainAdapter.getAddress({ wallet: walletState.wallet })
	      setUserAddress(userAddress)
	    } catch (error) {
	    }
	  })()
	}, [chainAdapterManager, walletState.wallet])

	console.log('useWalletAddress',userAddress)

	return userAddress;
}