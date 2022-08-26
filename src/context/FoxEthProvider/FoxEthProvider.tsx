import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import {
  foxAssetId,
  foxEthLpAssetId,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from 'features/defi/providers/fox-eth-lp/constants'
import { useFoxEthLiquidityPool } from 'features/defi/providers/fox-eth-lp/hooks/useFoxEthLiquidityPool'
import { getOpportunityData } from 'features/defi/providers/fox-farming/api'
import {
  FOX_FARMING_V1_CONTRACT_ADDRESS,
  FOX_FARMING_V2_CONTRACT_ADDRESS,
  FOX_FARMING_V3_CONTRACT_ADDRESS,
  FOX_FARMING_V4_CONTRACT_ADDRESS,
} from 'features/defi/providers/fox-farming/constants'
import { FOX_TOKEN_CONTRACT_ADDRESS } from 'plugins/foxPage/const'
import { useLpApr } from 'plugins/foxPage/hooks/useLpApr'
import React, { createContext, useContext, useMemo } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { selectFeatureFlags } from 'state/slices/selectors'
import {
  selectAssetById,
  selectFirstAccountSpecifierByChainId,
  selectMarketDataById,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

const moduleLogger = logger.child({ namespace: ['FoxEthContext'] })

export type FoxFarmingEarnOpportunityType = {
  unclaimedRewards: string
  isVisible?: boolean
} & EarnOpportunityType

const icons = [
  'https://assets.coincap.io/assets/icons/eth@2x.png',
  'https://assets.coincap.io/assets/icons/fox@2x.png',
]

const lpOpportunity: EarnOpportunityType = {
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
  icons,
}

const baseFarmingOpportunity = {
  provider: DefiProvider.FoxFarming,
  rewardAddress: FOX_TOKEN_CONTRACT_ADDRESS,
  tvl: '',
  assetId: foxEthLpAssetId,
  fiatAmount: '',
  cryptoAmount: '',
  unclaimedRewards: '',
  chainId: ethChainId,
  isLoaded: false,
  type: DefiType.Farming,
  icons,
}

const v4FarmingOpportunity: FoxFarmingEarnOpportunityType = {
  ...baseFarmingOpportunity,
  contractAddress: FOX_FARMING_V4_CONTRACT_ADDRESS,
  opportunityName: 'Fox Farming V4',
}

const v3FarmingOpportunity: FoxFarmingEarnOpportunityType = {
  ...baseFarmingOpportunity,
  contractAddress: FOX_FARMING_V3_CONTRACT_ADDRESS,
  opportunityName: 'Fox Farming V3',
}

const v2FarmingOpportunity: FoxFarmingEarnOpportunityType = {
  ...baseFarmingOpportunity,
  contractAddress: FOX_FARMING_V2_CONTRACT_ADDRESS,
  opportunityName: 'Fox Farming V2',
}

const v1FarmingOpportunity: FoxFarmingEarnOpportunityType = {
  ...baseFarmingOpportunity,
  contractAddress: FOX_FARMING_V1_CONTRACT_ADDRESS,
  opportunityName: 'Fox Farming V1',
}

type FoxEthProviderProps = {
  children: React.ReactNode
}

type IFoxLpAndFarmingOpportunitiesContext = {
  totalBalance: string
  lpFoxBalance: string | null
  lpEthBalance: string | null
  foxEthLpOpportunity: EarnOpportunityType
  foxFarmingOpportunities: FoxFarmingEarnOpportunityType[]
  onlyVisibleFoxFarmingOpportunities: FoxFarmingEarnOpportunityType[]
  lpLoading: boolean
  farmingLoading: boolean
  onOngoingTxIdChange: (txid: string) => Promise<void>
}

const FoxLpAndFarmingOpportunitiesContext = createContext<IFoxLpAndFarmingOpportunitiesContext>({
  totalBalance: '0',
  lpFoxBalance: null,
  lpEthBalance: null,
  foxEthLpOpportunity: lpOpportunity,
  foxFarmingOpportunities: [v4FarmingOpportunity],
  onlyVisibleFoxFarmingOpportunities: [v4FarmingOpportunity],
  lpLoading: true,
  farmingLoading: true,
  onOngoingTxIdChange: (_txid: string) => Promise.resolve(),
})

export const FoxEthProvider = ({ children }: FoxEthProviderProps) => {
  const {
    state: { wallet },
  } = useWallet()
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(
    ethAsset.chainId,
  ) as ChainAdapter<KnownChainIds.EthereumMainnet>

  const [lpLoading, setLpLoading] = useState<boolean>(true)
  const [lpFoxBalance, setLpFoxBalance] = useState<string | null>(null)
  const [lpEthBalance, setLpEthBalance] = useState<string | null>(null)
  const [ongoingTxId, setOngoingTxId] = useState<string | null>(null)
  const [foxEthLpOpportunity, setFoxEthLpOpportunity] = useState<EarnOpportunityType>(lpOpportunity)
  const { calculateHoldings, getLpTVL } = useFoxEthLiquidityPool()

  const [connectedWalletEthAddress, setConnectedWalletEthAddress] = useState<string | null>(null)
  const [farmingLoading, setFarmingLoading] = useState<boolean>(true)
  const [foxFarmingTotalBalance, setFoxFarmingTotalBalance] = useState<string>('')
  const [foxFarmingOpportunities, setFoxFarmingOpportunities] = useState<
    FoxFarmingEarnOpportunityType[]
  >([v4FarmingOpportunity, v3FarmingOpportunity, v2FarmingOpportunity, v1FarmingOpportunity])
  const { lpApr } = useLpApr()
  const ethMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))
  const foxMarketData = useAppSelector(state => selectMarketDataById(state, foxAssetId))
  const foxAssetPrecision = useAppSelector(state => selectAssetById(state, foxAssetId)).precision
  const lpAssetPrecision = useAppSelector(state =>
    selectAssetById(state, foxEthLpAssetId),
  ).precision
  const featureFlags = useAppSelector(selectFeatureFlags)

  useEffect(() => {
    if (wallet && adapter) {
      ;(async () => {
        if (!supportsETH(wallet)) return
        const address = await adapter.getAddress({ wallet })
        setConnectedWalletEthAddress(address)
      })()
    }
  }, [adapter, wallet])

  const fetchFarmingOpportunities = useCallback(async () => {
    moduleLogger.info('fetching farming opportunities')
    if (!connectedWalletEthAddress) return
    try {
      const newOpportunities = await Promise.all(
        foxFarmingOpportunities.map(async opportunity => {
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
            isLoaded: true,
            unclaimedRewards: balances.unclaimedRewards,
            expired,
            apy: lpApr && !expired ? bnOrZero(apr).plus(lpApr).toString() : '0',
            tvl,
            // show opportunities that are not expired or ended but user have balance in them
            isVisible: !expired || (expired && bnOrZero(balances.cryptoBalance).gt(0)),
          }
        }),
      )
      const totalOportunitiesBalances = newOpportunities.reduce(
        (acc, newOpportunity) => acc.plus(bnOrZero(newOpportunity.fiatAmount)),
        bnOrZero(0),
      )
      setFoxFarmingTotalBalance(totalOportunitiesBalances.toFixed(2))
      setFoxFarmingOpportunities(newOpportunities)
    } catch (error) {
      moduleLogger.error(error, 'fetchFarmingOpportunities failed')
    } finally {
      setFarmingLoading(false)
    }
  }, [
    connectedWalletEthAddress,
    foxFarmingOpportunities,
    ethAsset.precision,
    ethMarketData.price,
    lpAssetPrecision,
    foxMarketData.price,
    foxAssetPrecision,
    lpApr,
  ])

  const fetchLpOpportunity = useCallback(async () => {
    moduleLogger.info('fetching LP pportunity')
    try {
      const balances = await calculateHoldings()
      if (balances) {
        const { lpBalance, foxBalance, ethBalance } = balances
        setLpFoxBalance(foxBalance.toString())
        setLpEthBalance(ethBalance.toString())
        const totalLpBalance = bn(lpBalance).div(bn(10).pow(lpAssetPrecision))
        const ethValue = ethBalance.times(ethMarketData.price)
        const foxValue = foxBalance.times(foxMarketData.price)
        const fiatAmount = ethValue.plus(foxValue).toFixed(2)
        const totalSupply = await getLpTVL()
        setFoxEthLpOpportunity({
          ...lpOpportunity,
          cryptoAmount: totalLpBalance.toString(),
          fiatAmount,
          isLoaded: true,
          apy: lpApr ?? undefined,
          tvl: totalSupply ?? '',
        })
      }
    } catch (error) {
      moduleLogger.error(error, 'fetchLpOpportunity failed')
    } finally {
      setLpLoading(false)
    }
  }, [
    calculateHoldings,
    lpApr,
    getLpTVL,
    foxMarketData.price,
    ethMarketData.price,
    lpAssetPrecision,
  ])

  // reload opportunities when wallet changes
  useEffect(() => {
    if (!(connectedWalletEthAddress && lpApr)) return
    ;(async () => {
      fetchFarmingOpportunities()
      fetchLpOpportunity()
    })()
    // to avoid refetching when the callback functions signatures change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedWalletEthAddress, lpApr])

  // watch tx to reload opportunities if it got confirmed
  const accountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, ethChainId),
  )

  const transaction = useAppSelector(gs => selectTxById(gs, ongoingTxId ?? ''))

  const handleOngoingTxIdChange = useCallback(
    async (txid: string) => {
      if (!connectedWalletEthAddress) return
      setOngoingTxId(serializeTxIndex(accountSpecifier, txid, connectedWalletEthAddress))
    },
    [accountSpecifier, connectedWalletEthAddress],
  )

  useEffect(() => {
    if (transaction && transaction.status !== TxStatus.Pending) {
      if (transaction.status === TxStatus.Confirmed) {
        fetchFarmingOpportunities()
        fetchLpOpportunity()
        setOngoingTxId(null)
      }
    }
  }, [fetchFarmingOpportunities, fetchLpOpportunity, transaction])

  const value = useMemo(
    () => ({
      totalBalance: bnOrZero(featureFlags.FoxLP ? foxEthLpOpportunity.fiatAmount : 0)
        .plus(featureFlags.FoxFarming ? foxFarmingTotalBalance : 0)
        .toString(),
      lpFoxBalance,
      lpEthBalance,
      foxEthLpOpportunity,
      foxFarmingOpportunities,
      onlyVisibleFoxFarmingOpportunities: foxFarmingOpportunities.filter(
        opportunity => opportunity.isVisible,
      ),
      lpLoading,
      farmingLoading,
      onOngoingTxIdChange: handleOngoingTxIdChange,
    }),
    [
      featureFlags.FoxLP,
      featureFlags.FoxFarming,
      foxEthLpOpportunity,
      foxFarmingTotalBalance,
      lpFoxBalance,
      lpEthBalance,
      foxFarmingOpportunities,
      lpLoading,
      farmingLoading,
      handleOngoingTxIdChange,
    ],
  )

  return (
    <FoxLpAndFarmingOpportunitiesContext.Provider value={value}>
      {children}
    </FoxLpAndFarmingOpportunitiesContext.Provider>
  )
}

export const useFoxEth = () => useContext(FoxLpAndFarmingOpportunitiesContext)
