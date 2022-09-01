import { ethChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react' // useMemo
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import {
  MergedFoxyOpportunity,
  useGetFoxyAprQuery,
  useGetFoxyBalancesQuery,
} from 'state/apis/foxy/foxyApi'
// import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
// import { useAppSelector } from 'state/store'

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

  // const filter = useMemo(() => ({ accountId }), [accountId])
  // const accountMeta = useAppSelector(state =>
  //   selectPortfolioAccountMetadataByAccountId(state, filter),
  // )
  // const { accountType, bip44Params } = accountMeta

  useEffect(() => {
    ;(async () => {
      const chainAdapter = await getChainAdapterManager().get(KnownChainIds.EthereumMainnet)
      if (!chainAdapter || !wallet) return
      const bip44Params = chainAdapter.getBIP44Params({ accountNumber: 0 })
      const userAddress = await chainAdapter.getAddress({ wallet, bip44Params })
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
