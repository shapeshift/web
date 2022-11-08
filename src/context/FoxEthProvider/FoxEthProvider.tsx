import type { AccountId } from '@keepkey/caip'
import { ethAssetId, ethChainId, foxAssetId, fromAccountId } from '@keepkey/caip'
import type { ChainAdapter } from '@keepkey/chain-adapters'
import type { KnownChainIds } from '@keepkey/types'
import { TxStatus } from '@keepkey/unchained-client'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { getLpTokenPrice } from 'features/defi/providers/fox-eth-lp/api'
import {
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
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectFeatureFlags,
  selectMarketDataById,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

const moduleLogger = logger.child({ namespace: ['FoxEthContext'] })

export type FoxFarmingEarnOpportunityType = {
  unclaimedRewards: string
  isVisible?: boolean
} & EarnOpportunityType

const icons = [
  'https://assets.coincap.io/assets/icons/eth@2x.png',
  'https://assets.coincap.io/assets/icons/256/fox.png',
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
  accountId: Nullable<AccountId>
  setAccountId: (accountId: AccountId) => void
  totalBalance: string
  lpFoxBalance: string | null
  lpEthBalance: string | null
  lpTokenPrice: string | null
  foxFarmingTotalBalanceInBaseUnit: string | null
  foxEthLpOpportunity: EarnOpportunityType
  accountAddress: string | null
  foxFarmingOpportunities: FoxFarmingEarnOpportunityType[]
  onlyVisibleFoxFarmingOpportunities: FoxFarmingEarnOpportunityType[]
  lpLoading: boolean
  farmingLoading: boolean
  onOngoingTxIdChange: (txid: string) => Promise<void>
}

const FoxLpAndFarmingOpportunitiesContext = createContext<IFoxLpAndFarmingOpportunitiesContext>({
  setAccountId: _accountId => {},
  accountId: null,
  totalBalance: '0',
  lpFoxBalance: null,
  lpEthBalance: null,
  lpTokenPrice: null,
  foxFarmingTotalBalanceInBaseUnit: null,
  accountAddress: null,
  foxEthLpOpportunity: lpOpportunity,
  foxFarmingOpportunities: [v4FarmingOpportunity],
  onlyVisibleFoxFarmingOpportunities: [v4FarmingOpportunity],
  lpLoading: true,
  farmingLoading: true,
  onOngoingTxIdChange: (_txid: string) => Promise.resolve(),
})

export const FoxEthProvider = ({ children }: FoxEthProviderProps) => {
  const featureFlags = useAppSelector(selectFeatureFlags)
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
  const [accountAddress, setAccountAddress] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<Nullable<AccountId>>(null)
  const { calculateHoldings, getLpTVL } = useFoxEthLiquidityPool(accountAddress, {
    skip: !featureFlags.FoxLP,
  })

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  // Use the account number of the consumer if we have it, else use account 0
  const bip44Params =
    useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter)) ??
    adapter.getBIP44Params({ accountNumber: 0 })

  const [farmingLoading, setFarmingLoading] = useState<boolean>(true)
  const [foxFarmingTotalBalance, setFoxFarmingTotalBalance] = useState<string>('')
  const [foxFarmingOpportunities, setFoxFarmingOpportunities] = useState<
    FoxFarmingEarnOpportunityType[]
  >([v4FarmingOpportunity, v3FarmingOpportunity, v2FarmingOpportunity, v1FarmingOpportunity])
  const { lpApr } = useLpApr({ skip: !featureFlags.FoxLP })
  const ethMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))
  const foxMarketData = useAppSelector(state => selectMarketDataById(state, foxAssetId))
  const foxAssetPrecision = useAppSelector(state => selectAssetById(state, foxAssetId)).precision
  const ethAssetPrecision = useAppSelector(state => selectAssetById(state, ethAssetId)).precision
  const lpAssetPrecision = useAppSelector(state =>
    selectAssetById(state, foxEthLpAssetId),
  ).precision
  const [lpTokenPrice, setLpTokenPrice] = useState<string | null>(null)

  // TODO: Remove this useEffect
  // The reason why it is still here is because we use accountAddress both for the modals, and to display the DeFi cards/rows
  // If we remove it now, we will be unable to get to the modal in the first place to change accounts
  useEffect(() => {
    if (
      // get price if at least one of lp or farming were on
      (featureFlags.FoxLP || featureFlags.FoxFarming) &&
      ethAssetPrecision &&
      ethMarketData.price &&
      lpAssetPrecision
    ) {
      ;(async () => {
        try {
          const lpTokenPrice = await getLpTokenPrice(
            ethAssetPrecision,
            ethMarketData.price,
            lpAssetPrecision,
          )
          setLpTokenPrice(lpTokenPrice)
        } catch (error) {
          moduleLogger.error(error, 'getLpTokenPrice failed')
        }
      })()
    }
  }, [
    ethAssetPrecision,
    ethMarketData.price,
    featureFlags.FoxFarming,
    featureFlags.FoxLP,
    lpAssetPrecision,
  ])

  useEffect(() => {
    if (wallet && adapter && bip44Params) {
      ;(async () => {
        if (!supportsETH(wallet)) return
        const address = await adapter.getAddress({ wallet, bip44Params })
        setAccountAddress(address)
      })()
    }
  }, [adapter, wallet, bip44Params])

  useEffect(() => {
    if (!accountId) return
    ;(async () => {
      const accountAddress = fromAccountId(accountId).account
      setAccountAddress(accountAddress)
    })()
  }, [accountId])

  const fetchFarmingOpportunities = useCallback(async () => {
    moduleLogger.info('fetching farming opportunities')
    if (!accountAddress) return
    try {
      const newOpportunities = await Promise.all(
        foxFarmingOpportunities.map(async opportunity => {
          const data = await getOpportunityData({
            contractAddress: opportunity.contractAddress,
            ethAssetPrecision: ethAsset.precision,
            ethPrice: ethMarketData.price,
            lpAssetPrecision,
            address: accountAddress,
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
    accountAddress,
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
          apy: lpApr ?? '0',
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

  const isMarketDataReady = useMemo(() => {
    return !!ethMarketData.price && !!foxMarketData.price
  }, [ethMarketData.price, foxMarketData.price])

  // reload opportunities when wallet changes
  useEffect(() => {
    if (!(featureFlags.FoxLP || featureFlags.FoxFarming)) return
    if (!(accountAddress && lpApr && isMarketDataReady && lpAssetPrecision && foxAssetPrecision))
      return
    ;(async () => {
      fetchFarmingOpportunities()
      fetchLpOpportunity()
    })()
    // market data causes fetch callback function to create a new reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountAddress, lpApr, lpAssetPrecision, foxAssetPrecision, isMarketDataReady])

  const transaction = useAppSelector(gs => selectTxById(gs, ongoingTxId ?? ''))

  const handleOngoingTxIdChange = useCallback(
    async (txid: string) => {
      if (!(accountId && accountAddress)) return
      setOngoingTxId(serializeTxIndex(accountId, txid, accountAddress))
    },
    [accountId, accountAddress],
  )

  useEffect(() => {
    if (!(featureFlags.FoxLP || featureFlags.FoxFarming)) return
    if (transaction && transaction.status !== TxStatus.Pending) {
      if (transaction.status === TxStatus.Confirmed) {
        fetchFarmingOpportunities()
        fetchLpOpportunity()
        setOngoingTxId(null)
      }
    }
  }, [
    fetchFarmingOpportunities,
    featureFlags.FoxFarming,
    featureFlags.FoxLP,
    fetchLpOpportunity,
    transaction,
  ])

  const foxFarmingTotalCryptoAmount = foxFarmingOpportunities
    .reduce((acc, opportunity) => {
      return acc.plus(bnOrZero(opportunity.cryptoAmount))
    }, bnOrZero(0))
    .toString()

  const value = useMemo(
    () => ({
      accountId,
      setAccountId,
      accountAddress,
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
      foxFarmingTotalBalanceInBaseUnit: bnOrZero(foxFarmingTotalCryptoAmount)
        .times(bn(10).pow(lpAssetPrecision))
        .toString(),
      onOngoingTxIdChange: handleOngoingTxIdChange,
      lpTokenPrice,
    }),
    [
      featureFlags.FoxLP,
      featureFlags.FoxFarming,
      accountId,
      setAccountId,
      accountAddress,
      foxEthLpOpportunity,
      foxFarmingTotalBalance,
      foxFarmingTotalCryptoAmount,
      lpFoxBalance,
      lpEthBalance,
      foxFarmingOpportunities,
      lpLoading,
      farmingLoading,
      handleOngoingTxIdChange,
      lpTokenPrice,
      lpAssetPrecision,
    ],
  )

  return (
    <FoxLpAndFarmingOpportunitiesContext.Provider value={value}>
      {children}
    </FoxLpAndFarmingOpportunitiesContext.Provider>
  )
}

export const useFoxEth = () => useContext(FoxLpAndFarmingOpportunitiesContext)
