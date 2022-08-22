import { AssetId, ChainId, ethChainId } from '@shapeshiftoss/caip'
import { DefiType, WithdrawInfo } from '@shapeshiftoss/investor-foxy'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useFoxyApr } from 'plugins/foxPage/hooks/useFoxyApr'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { useGetFoxyBalancesQuery } from 'state/apis/foxy/foxyBalancesApi'
import { selectPortfolioAssetBalances, selectPortfolioLoading } from 'state/slices/selectors'

export type FoxyOpportunity = {
  type: DefiType
  provider: string
  version: string
  contractAddress: string
  rewardToken: string
  stakingToken: string
  chainId: ChainId
  tvl?: BigNumber
  expired?: boolean
  apy?: string
  balance: string
  contractAssetId: AssetId
  tokenAssetId: AssetId
  rewardTokenAssetId: AssetId
  pricePerShare: BigNumber
  withdrawInfo: WithdrawInfo
}

export type MergedFoxyOpportunity = FoxyOpportunity & {
  cryptoAmount: string
  fiatAmount: string
}
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

  const { foxyApr } = useFoxyApr()

  const supportsEthereumChain = useWalletSupportsChain({ chainId: ethChainId, wallet })

  const foxyBalances = useGetFoxyBalancesQuery({
    supportsEthereumChain,
    userAddress,
    foxyApr,
  })

  return foxyBalances
}
