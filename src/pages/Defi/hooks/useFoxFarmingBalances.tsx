import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { foxAssetId, foxEthLpAssetId } from 'features/defi/providers/fox-eth-lp/constants'
import { FOX_FARMING_CONTRACT_ADDRESS } from 'features/defi/providers/fox-farming/constants'
import { useFoxFarming } from 'features/defi/providers/fox-farming/hooks/useFoxFarming'
import { FOX_TOKEN_CONTRACT_ADDRESS } from 'plugins/foxPage/const'
import { useFarmingApr } from 'plugins/foxPage/hooks/useFarmingApr'
import { useLpApr } from 'plugins/foxPage/hooks/useLpApr'
import { useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type UseFoxFarmingBalancesReturn = {
  opportunities: EarnOpportunityType[]
  loading: boolean
}

const defaultOpportunity: EarnOpportunityType = {
  provider: DefiProvider.FoxFarming,
  contractAddress: FOX_FARMING_CONTRACT_ADDRESS,
  rewardAddress: FOX_TOKEN_CONTRACT_ADDRESS,
  tvl: '',
  assetId: foxEthLpAssetId,
  fiatAmount: '',
  cryptoAmount: '',
  chainId: ethChainId,
  isLoaded: false,
  type: DefiType.Farming,
  icons: [
    'https://assets.coincap.io/assets/icons/eth@2x.png',
    'https://assets.coincap.io/assets/icons/fox@2x.png',
  ],
  opportunityName: 'Fox Farming V4',
}

export function useFoxFarmingBalances(): UseFoxFarmingBalancesReturn {
  const {
    state: { wallet },
  } = useWallet()
  const [loading, setLoading] = useState<boolean>(true)
  const [opportunities, setOpportunities] = useState<EarnOpportunityType[]>([defaultOpportunity])
  const { calculateHoldings, getTVL } = useFoxFarming()
  const { isFarmingAprV4Loaded, farmingAprV4 } = useFarmingApr()
  const { isLpAprLoaded, lpApr } = useLpApr()
  const foxMarketData = useAppSelector(state => selectMarketDataById(state, foxAssetId))
  const ethMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      setLoading(true)
      try {
        const balances = await calculateHoldings()
        if (balances) {
          const totalSupply = await getTVL()
          setOpportunities([
            {
              ...defaultOpportunity,
              isLoaded: isFarmingAprV4Loaded && isLpAprLoaded,
              apy:
                farmingAprV4 && lpApr
                  ? bnOrZero(farmingAprV4)
                      .plus(lpApr ?? 0)
                      .toString()
                  : undefined,
              tvl: totalSupply ?? '',
            },
          ])
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
    isFarmingAprV4Loaded,
    farmingAprV4,
    isLpAprLoaded,
    lpApr,
  ])

  return {
    opportunities,
    loading,
  }
}
