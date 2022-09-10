import { ethChainId, toAccountId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect, useMemo, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import type { MergedFoxyOpportunity } from 'state/apis/foxy/foxyApi'
import { useGetFoxyAprQuery, useGetFoxyBalancesQuery } from 'state/apis/foxy/foxyApi'

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

  const accountId = useMemo(
    () =>
      userAddress
        ? toAccountId({
            chainId: ethChainId,
            account: userAddress,
          })
        : null,
    [userAddress],
  )

  const foxyBalances = useGetFoxyBalancesQuery(
    {
      userAddress: userAddress!,
      foxyApr: foxyAprData?.foxyApr!,
      accountId: accountId!,
    },
    { skip: !foxyAprData || !supportsEthereumChain || !userAddress || !accountId },
  )

  return foxyBalances
}
