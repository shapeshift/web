import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import {
  foxAssetId,
  foxEthLpAssetId,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from 'features/defi/providers/fox-eth-lp/constants'
import { useFoxFarming } from 'features/defi/providers/fox-farming/hooks/useFoxFarming'
import { useFarmingApr } from 'plugins/foxPage/hooks/useFarmingApr'
import { useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type UseFoxFarmingBalancesReturn = {
  opportunity: EarnOpportunityType
  balance: string
  loading: boolean
}

const defaultOpportunity: EarnOpportunityType = {
  provider: DefiProvider.FoxFarming,
  contractAddress: UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
  rewardAddress: '',
  tvl: '',
  assetId: foxEthLpAssetId,
  fiatAmount: '',
  cryptoAmount: '',
  chainId: ethChainId,
  isLoaded: false,
  type: DefiType.Farming,
}

export function useFoxFarmingBalances(): UseFoxFarmingBalancesReturn {
  const {
    state: { wallet },
  } = useWallet()
  const [loading, setLoading] = useState<boolean>(true)
  const [opportunity, setOpportunity] = useState<EarnOpportunityType>(defaultOpportunity)
  const { calculateHoldings, getTVL } = useFoxFarming()
  const { isFarmingAprV4Loaded, farmingAprV4 } = useFarmingApr()
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
          const totalSupply = await getTVL()
          setOpportunity({
            ...defaultOpportunity,
            isLoaded: isFarmingAprV4Loaded,
            apy: farmingAprV4 ?? undefined,
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
    foxMarketData.price,
    ethMarketData.price,
    getTVL,
    lpAssetPrecision,
    isFarmingAprV4Loaded,
    farmingAprV4,
  ])

  return {
    opportunity,
    balance: opportunity.cryptoAmount,
    loading,
  }
}
