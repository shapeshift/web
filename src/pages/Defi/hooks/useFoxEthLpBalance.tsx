import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { UNISWAP_V2_WETH_FOX_POOL_ADDRESS } from 'features/defi/providers/fox-eth-lp/const'
import { useFoxEthLiquidityPool } from 'features/defi/providers/fox-eth-lp/hooks/useFoxEthLiquidityPool'
import { useLpApr } from 'plugins/foxPage/hooks/useLpApr'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectPortfolioAssetBalances, selectPortfolioLoading } from 'state/slices/selectors'

export type UseFoxEthLpBalanceReturn = {
  opportunity: EarnOpportunityType
  balance: string
  loading: boolean
}

const defaultOpportunity: EarnOpportunityType = {
  provider: DefiProvider.FoxEthLP,
  contractAddress: UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
  rewardAddress: '',
  tvl: '',
  assetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
  fiatAmount: '',
  cryptoAmount: '',
  chainId: 'eip155:1',
  isLoaded: false,
  type: DefiType.LiquidityPool,
}

export function useFoxEthLpBalance(): UseFoxEthLpBalanceReturn {
  const {
    state: { wallet },
  } = useWallet()
  const [loading, setLoading] = useState(false)
  const [opportunity, setOpportunity] = useState<EarnOpportunityType>(defaultOpportunity)
  const { calculateHoldings, getLpTVL } = useFoxEthLiquidityPool()
  const { lpApr } = useLpApr()

  const balances = useSelector(selectPortfolioAssetBalances)
  const balancesLoading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      setLoading(true)
      try {
        const lpBalance = await calculateHoldings()
        const totalSupply = await getLpTVL()
        setOpportunity({
          ...defaultOpportunity,
          cryptoAmount: lpBalance,
          isLoaded: true,
          apy: lpApr ?? undefined,
          tvl: totalSupply ?? '',
        })
      } catch (error) {
        console.error('error', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [balances, wallet, balancesLoading, calculateHoldings, lpApr, getLpTVL])

  return {
    opportunity,
    balance: opportunity.cryptoAmount,
    loading: loading || balancesLoading,
  }
}
