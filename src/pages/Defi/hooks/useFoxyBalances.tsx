import { ethChainId, toAccountId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect, useMemo, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import type { MergedFoxyOpportunity } from 'state/apis/foxy/foxyApi'
import { useGetFoxyAprQuery, useGetFoxyBalancesQuery } from 'state/apis/foxy/foxyApi'
import type { Nullable } from 'types/common'

export type UseFoxyBalancesReturn = {
  opportunities: MergedFoxyOpportunity[]
  totalBalance: string
  loading: boolean
}

export function useFoxyBalances({
  defaultUserAddress,
}: { defaultUserAddress?: Nullable<string> } = {}) {
  const [userAddress, setUserAddress] = useState<string | null>(null)

  const {
    state: { wallet },
  } = useWallet()

  useEffect(() => {
    ;(async () => {
      const chainAdapter = getChainAdapterManager().get(KnownChainIds.EthereumMainnet)
      if (!chainAdapter || !wallet) return
      // TODO accountNumber needs to come from account metadata
      const bip44Params = chainAdapter.getBIP44Params({ accountNumber: 0 })
      const userAddress = await chainAdapter.getAddress({ wallet, bip44Params })
      setUserAddress(userAddress)
    })()
  }, [wallet, defaultUserAddress])

  const { data: foxyAprData } = useGetFoxyAprQuery()

  const supportsEthereumChain = useWalletSupportsChain({ chainId: ethChainId, wallet })

  const accountId = useMemo(
    () =>
      defaultUserAddress || userAddress
        ? toAccountId({
            chainId: ethChainId,
            account: (defaultUserAddress ?? userAddress)!,
          })
        : null,
    [defaultUserAddress, userAddress],
  )

  const foxyBalances = useGetFoxyBalancesQuery(
    {
      userAddress: userAddress!,
      foxyApr: foxyAprData?.foxyApr!,
      accountId: accountId!,
    },
    {
      skip:
        !Boolean((userAddress ?? defaultUserAddress)?.length) ||
        !foxyAprData ||
        !supportsEthereumChain ||
        !accountId,
    },
  )

  return foxyBalances
}
