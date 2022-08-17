import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { foxEthLpAssetId } from 'features/defi/providers/fox-eth-lp/constants'
import { foxAssetId } from 'features/defi/providers/fox-eth-lp/constants'
import { getOpportunityData } from 'features/defi/providers/fox-farming/api'
import { FOX_FARMING_CONTRACT_ADDRESS } from 'features/defi/providers/fox-farming/constants'
import { FOX_TOKEN_CONTRACT_ADDRESS } from 'plugins/foxPage/const'
import { useLpApr } from 'plugins/foxPage/hooks/useLpApr'
import { useEffect, useMemo, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
const moduleLogger = logger.child({ namespace: ['useFoxFarmingBalances'] })

export type FoxFarmingEarnOpportunityType = {
  unclaimedRewards: string
} & EarnOpportunityType

export type UseFoxFarmingBalancesReturn = {
  opportunities: FoxFarmingEarnOpportunityType[]
  loading: boolean
  totalBalance: string
}

const defaultOpportunity: FoxFarmingEarnOpportunityType = {
  provider: DefiProvider.FoxFarming,
  contractAddress: FOX_FARMING_CONTRACT_ADDRESS,
  rewardAddress: FOX_TOKEN_CONTRACT_ADDRESS,
  tvl: '',
  assetId: foxEthLpAssetId,
  fiatAmount: '',
  cryptoAmount: '',
  unclaimedRewards: '',
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
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>

  useEffect(() => {
    if (wallet && adapter) {
      ;(async () => {
        const address = await adapter.getAddress({ wallet })
        setConnectedWalletEthAddress(address)
      })()
    }
  }, [adapter, wallet])

  const [connectedWalletEthAddress, setConnectedWalletEthAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [totalBalance, setTotalBalance] = useState<string>('')
  const [opportunities, setOpportunities] = useState<FoxFarmingEarnOpportunityType[]>([
    defaultOpportunity,
  ])
  const { isLpAprLoaded, lpApr } = useLpApr()
  const ethMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))
  const foxMarketData = useAppSelector(state => selectMarketDataById(state, foxAssetId))
  const foxAssetPrecision = useAppSelector(state => selectAssetById(state, foxAssetId)).precision
  const lpAssetPrecision = useAppSelector(state =>
    selectAssetById(state, foxEthLpAssetId),
  ).precision

  useMemo(() => {
    if (!(wallet && connectedWalletEthAddress && lpApr)) return
    ;(async () => {
      setLoading(true)
      try {
        const newOpportunities = await Promise.all(
          opportunities.map(async opportunity => {
            const data = await getOpportunityData({
              contractAddress: opportunity.contractAddress,
              ethAssetPrecision: ethAsset.precision,
              ethPrice: ethMarketData.price,
              lpAssetPrecision,
              address: connectedWalletEthAddress,
              foxPrice: foxMarketData.price,
              foxAssetPrecision,
            })
            if (!data) return opportunity
            const { tvl, apr, balances, expired } = data
            return {
              ...opportunity,
              cryptoAmount: balances.cryptoBalance,
              fiatAmount: balances.fiatBalance,
              isLoaded: isLpAprLoaded,
              unclaimedRewards: balances.unclaimedRewards,
              expired,
              apy: lpApr
                ? bnOrZero(apr)
                    .plus(lpApr ?? 0)
                    .toString()
                : undefined,
              tvl,
            }
          }),
        )
        const totalOpBalances = newOpportunities.reduce(
          (acc, cur) => acc.plus(bnOrZero(cur.fiatAmount)),
          bnOrZero(0),
        )
        setTotalBalance(totalOpBalances.toFixed(2))
        setOpportunities(newOpportunities)
      } catch (error) {
        moduleLogger.error(error, 'error')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, connectedWalletEthAddress, lpApr])

  return {
    opportunities,
    loading,
    totalBalance,
  }
}
