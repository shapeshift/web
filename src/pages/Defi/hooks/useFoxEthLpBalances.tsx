import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import {
  foxAssetId,
  foxEthLpAssetId,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from 'features/defi/providers/fox-eth-lp/constants'
import { useFoxEthLiquidityPool } from 'features/defi/providers/fox-eth-lp/hooks/useFoxEthLiquidityPool'
import { useLpApr } from 'plugins/foxPage/hooks/useLpApr'
import { useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type UseFoxEthLpBalancesReturn = {
  opportunity: EarnOpportunityType
  balance: string
  foxBalance: string | null
  ethBalance: string | null
  loading: boolean
}

const defaultOpportunity: EarnOpportunityType = {
  provider: DefiProvider.FoxEthLP,
  contractAddress: UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
  rewardAddress: '',
  tvl: '',
  assetId: foxEthLpAssetId,
  fiatAmount: '',
  cryptoAmount: '',
  chainId: ethChainId,
  isLoaded: false,
  type: DefiType.LiquidityPool,
}

export function useFoxEthLpBalances(): UseFoxEthLpBalancesReturn {
  const {
    state: { wallet },
  } = useWallet()
  const [loading, setLoading] = useState<boolean>(true)
  const [foxBalance, setFoxBalance] = useState<string | null>(null)
  const [ethBalance, setEthBalance] = useState<string | null>(null)
  const [opportunity, setOpportunity] = useState<EarnOpportunityType>(defaultOpportunity)
  const { calculateHoldings, getLpTVL } = useFoxEthLiquidityPool()
  const { lpApr } = useLpApr()
  const foxMarketData = useAppSelector(state => selectMarketDataById(state, foxAssetId))
  const ethMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))
  const lpAssetPrecision = useAppSelector(state =>
    selectAssetById(state, opportunity.assetId),
  ).precision

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      setLoading(true)
      try {
        const balances = await calculateHoldings()
        if (balances) {
          const { lpBalance, foxBalance, ethBalance } = balances
          setFoxBalance(foxBalance.toString())
          setEthBalance(ethBalance.toString())
          const totalLpBalance = bnOrZero(lpBalance).div(`1e${lpAssetPrecision}`)
          const ethValue = ethBalance.times(ethMarketData.price)
          const foxValue = foxBalance.times(foxMarketData.price)
          const fiatAmount = ethValue.plus(foxValue).toFixed(2)
          const totalSupply = await getLpTVL()
          setOpportunity({
            ...defaultOpportunity,
            cryptoAmount: totalLpBalance?.toString() ?? '0',
            fiatAmount,
            isLoaded: true,
            apy: lpApr ?? undefined,
            tvl: totalSupply ?? '',
          })
        }
      } catch (error) {
        console.error('error', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [
    wallet,
    calculateHoldings,
    lpApr,
    getLpTVL,
    foxMarketData.price,
    ethMarketData.price,
    lpAssetPrecision,
  ])

  return {
    opportunity,
    balance: opportunity.cryptoAmount,
    loading: loading || !opportunity.apy,
    foxBalance,
    ethBalance,
  }
}
