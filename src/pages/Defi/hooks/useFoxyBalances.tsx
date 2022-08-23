import { ethChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import {
  MergedFoxyOpportunity,
  useGetFoxyAprQuery,
  useGetFoxyBalancesQuery,
} from 'state/apis/foxy/foxyBalancesApi'

export type UseFoxyBalancesReturn = {
  opportunities: MergedFoxyOpportunity[]
  totalBalance: string
  loading: boolean
}

export function useFoxyBalances() {
  const [userAddress, setUserAddress] = useState<string | null>(null)

  const {
    state: { wallet },
  } = useWallet()

  useEffect(() => {
    ;(async () => {
      const chainAdapter = await getChainAdapterManager().get(KnownChainIds.EthereumMainnet)
      if (!chainAdapter || !wallet) return
      const userAddress = await chainAdapter.getAddress({ wallet })
      setUserAddress(userAddress)
    })()
  }, [wallet])

  const { data: foxyAprData } = useGetFoxyAprQuery()

  const supportsEthereumChain = useWalletSupportsChain({ chainId: ethChainId, wallet })

  const foxyBalances = useGetFoxyBalancesQuery(
    {
      userAddress: userAddress as string,
      foxyApr: foxyAprData?.foxyApr as string,
    },
    { skip: !foxyAprData || !supportsEthereumChain || !userAddress },
  )

  return foxyBalances
}
