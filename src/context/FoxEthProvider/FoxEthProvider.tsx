import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import React, { createContext, useContext, useMemo } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { foxEthLpAssetId } from 'state/slices/foxEthSlice/constants'
import { farmingOpportunities } from 'state/slices/foxEthSlice/foxEthCommon'
import {
  foxEthApi,
  useGetFoxEthLpAccountDataQuery,
  useGetFoxEthLpMetricsQuery,
} from 'state/slices/foxEthSlice/foxEthSlice'
import {
  selectAssetById,
  selectFirstAccountSpecifierByChainId,
  selectIsPortfolioLoaded,
  selectMarketDataById,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

const moduleLogger = logger.child({ namespace: ['FoxEthContext'] })

export type FoxFarmingEarnOpportunityType = {
  unclaimedRewards: string
  isVisible?: boolean
} & EarnOpportunityType

type FoxEthProviderProps = {
  children: React.ReactNode
}

type IFoxEthContext = {
  accountId: Nullable<AccountId>
  setAccountId: (accountId: AccountId) => void
  accountAddress: string
  onOngoingTxIdChange: (txid: string, contractAddress?: string) => Promise<void>
}

const FoxEthContext = createContext<IFoxEthContext>({
  setAccountId: _accountId => {},
  accountId: null,
  accountAddress: '',
  onOngoingTxIdChange: (_txid: string) => Promise.resolve(),
})

export const FoxEthProvider = ({ children }: FoxEthProviderProps) => {
  const {
    state: { wallet },
  } = useWallet()
  const foxLpEnabled = useFeatureFlag('FoxLP')
  const foxFarmingEnabled = useFeatureFlag('FoxFarming')
  const foxEthLpMarketData = useAppSelector(state => selectMarketDataById(state, foxEthLpAssetId))
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const isPortfolioLoaded = useAppSelector(selectIsPortfolioLoaded)
  const dispatch = useAppDispatch()

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(
    ethAsset.chainId,
  ) as ChainAdapter<KnownChainIds.EthereumMainnet>
  const [ongoingTxId, setOngoingTxId] = useState<string | null>(null)
  const [ongoingTxContractAddress, setOngoingTxContractAddress] = useState<string | null>(null)
  const [accountAddress, setAccountAddress] = useState<string>('')
  const [accountId, setAccountId] = useState<Nullable<AccountId>>(null)
  const readyToFetchLpData = isPortfolioLoaded && wallet && supportsETH(wallet)
  const readyToFetchFarmingData = readyToFetchLpData && foxEthLpMarketData.price !== '0'
  const readyToFetchLpAccountData =
    readyToFetchLpData && accountAddress && foxLpEnabled && foxEthLpMarketData.price !== '0'

  useGetFoxEthLpMetricsQuery(undefined, {
    skip: !readyToFetchLpData,
  })
  const { refetch: refetchFoxEthLpAccountData } = useGetFoxEthLpAccountDataQuery(
    { accountAddress },
    {
      skip: !readyToFetchLpAccountData,
    },
  )

  useEffect(() => {
    if (wallet && adapter) {
      ;(async () => {
        if (!supportsETH(wallet)) return
        const address = await adapter.getAddress({ wallet })
        setAccountAddress(address)
      })()
    }
  }, [adapter, wallet])

  useEffect(() => {
    if (!accountId) return
    const accountAddress = fromAccountId(accountId).account
    setAccountAddress(accountAddress)
  }, [accountId])

  // this hook handles the data we need from the farming opportunities
  useEffect(() => {
    if (!readyToFetchFarmingData) return
    // getting fox-eth lp token data
    const { getFoxFarmingContractMetrics, getFoxFarmingContractAccountData } = foxEthApi.endpoints
    ;(async () => {
      // getting fox-eth lp token balances
      farmingOpportunities.forEach(opportunity => {
        const { contractAddress } = opportunity
        // getting fox farm contract data
        dispatch(
          getFoxFarmingContractMetrics.initiate({
            contractAddress,
          }),
        )
        // getting fox farm contract balances
        // TODO: remove this condition when flags were removed
        if (foxFarmingEnabled && accountAddress)
          dispatch(
            getFoxFarmingContractAccountData.initiate({
              contractAddress,
              accountAddress,
            }),
          )
      })
    })()
  }, [accountAddress, dispatch, foxFarmingEnabled, readyToFetchFarmingData])

  // watch tx to reload opportunities if it got confirmed
  const accountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, ethChainId),
  )

  const transaction = useAppSelector(gs => selectTxById(gs, ongoingTxId ?? ''))

  const handleOngoingTxIdChange = useCallback(
    async (txid: string, contractAddress?: string) => {
      if (!accountAddress) return
      setOngoingTxId(serializeTxIndex(accountSpecifier, txid, accountAddress))
      if (contractAddress) setOngoingTxContractAddress(contractAddress)
    },
    [accountSpecifier, accountAddress],
  )

  useEffect(() => {
    if (accountAddress && transaction && transaction.status !== TxStatus.Pending) {
      if (transaction.status === TxStatus.Confirmed) {
        moduleLogger.info('Refetching fox lp/farming opportunities')
        refetchFoxEthLpAccountData()
        if (ongoingTxContractAddress)
          dispatch(
            foxEthApi.endpoints.getFoxFarmingContractAccountData.initiate(
              { accountAddress, contractAddress: ongoingTxContractAddress },
              { forceRefetch: true },
            ),
          )
        setOngoingTxId(null)
        setOngoingTxContractAddress(null)
      }
    }
  }, [accountAddress, ongoingTxContractAddress, dispatch, transaction, refetchFoxEthLpAccountData])

  const value = useMemo(
    () => ({
      accountId,
      setAccountId,
      accountAddress,
      onOngoingTxIdChange: handleOngoingTxIdChange,
    }),
    [accountId, setAccountId, accountAddress, handleOngoingTxIdChange],
  )

  return <FoxEthContext.Provider value={value}>{children}</FoxEthContext.Provider>
}

export const useFoxEth = () => useContext(FoxEthContext)
