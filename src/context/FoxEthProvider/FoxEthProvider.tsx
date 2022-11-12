import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, fromAccountId, toAccountId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import isEqual from 'lodash/isEqual'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { opportunitiesApi } from 'state/slices/opportunitiesSlice/opportunitiesSlice'
import {
  fetchAllOpportunitiesMetadata,
  fetchAllOpportunitiesUserData,
  fetchAllStakingOpportunitiesMetadata,
  fetchAllStakingOpportunitiesUserData,
} from 'state/slices/opportunitiesSlice/thunks'
import type { LpId, OpportunityMetadata } from 'state/slices/opportunitiesSlice/types'
import {
  selectAccountIdsByAssetId,
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from 'state/store'

const moduleLogger = logger.child({ namespace: ['FoxEthContext'] })

export type FoxFarmingEarnOpportunityType = OpportunityMetadata & {
  /**
   * @deprecated Here for backwards compatibility until https://github.com/shapeshift/web/pull/3218 goes in
   */
  unclaimedRewards?: string
  stakedAmountCryptoPrecision?: string
  rewardsAmountCryptoPrecision?: string
  underlyingToken0Amount?: string
  underlyingToken1Amount?: string
  isVisible?: boolean
  underlyingAssetId?: AssetId
} & EarnOpportunityType
type FoxEthProviderProps = {
  children: React.ReactNode
}

type IFoxEthContext = {
  farmingAccountId: AccountId | undefined
  setFarmingAccountId: (accountId: AccountId) => void
  lpAccountId: AccountId | undefined
  setLpAccountId: (accountId: AccountId) => void
  onOngoingFarmingTxIdChange: (txid: string, contractAddress?: string) => void
  onOngoingLpTxIdChange: (txid: string, contractAddress?: string) => void
}

const FoxEthContext = createContext<IFoxEthContext>({
  lpAccountId: undefined,
  farmingAccountId: undefined,
  setLpAccountId: _accountId => {},
  setFarmingAccountId: _accountId => {},
  onOngoingFarmingTxIdChange: (_txid: string) => Promise.resolve(),
  onOngoingLpTxIdChange: (_txid: string) => Promise.resolve(),
})

export const FoxEthProvider = ({ children }: FoxEthProviderProps) => {
  const {
    state: { wallet },
  } = useWallet()
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const dispatch = useAppDispatch()

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(
    ethAsset.chainId,
  ) as ChainAdapter<KnownChainIds.EthereumMainnet>
  const [ongoingTxId, setOngoingTxId] = useState<string | null>(null)
  const [ongoingTxContractAddress, setOngoingTxContractAddress] = useState<string | null>(null)
  const [farmingAccountId, setFarmingAccountId] = useState<AccountId | undefined>()
  const [lpAccountId, setLpAccountId] = useState<AccountId | undefined>()

  const filter = useMemo(() => ({ assetId: ethAssetId }), [])

  // TODO(gomes): deepEqualOutputFn should happen on the selector itself and give us the same reference every call but it somehow doesn't
  // Remove the equalityFn second arg here after we figure out why
  const ethAccountIds = useAppSelector(state => selectAccountIdsByAssetId(state, filter), isEqual)

  const refetchFoxEthLpAccountData = useCallback(async () => {
    await Promise.all(
      ethAccountIds.map(
        async accountId => await fetchAllOpportunitiesUserData(accountId, { forceRefetch: true }),
      ),
    )
  }, [ethAccountIds])

  useEffect(() => {
    ;(async () => {
      await fetchAllOpportunitiesMetadata()
    })()
  }, [ethAccountIds, dispatch, refetchFoxEthLpAccountData])

  useEffect(() => {
    ;(async () => {
      await refetchFoxEthLpAccountData()
    })()
  }, [refetchFoxEthLpAccountData])

  const lpAccountFilter = useMemo(() => ({ accountId: lpAccountId ?? '' }), [lpAccountId])
  // Use the account number of the consumer if we have it, else use account 0
  const lpBip44Params =
    useAppSelector(state => selectBIP44ParamsByAccountId(state, lpAccountFilter)) ??
    adapter.getBIP44Params({ accountNumber: 0 })

  useEffect(() => {
    // Get initial account 0 address from wallet, TODO: nuke it?
    if (wallet && adapter && lpBip44Params) {
      ;(async () => {
        if (!supportsETH(wallet)) return
        const address = await adapter.getAddress({ wallet, bip44Params: lpBip44Params })
        // eth.getAddress and similar return a checksummed address, but the account part of state opportunities' AccountId isn't checksummed
        // using the checksum version would make us unable to do Txid lookup
        setLpAccountId(toAccountId({ chainId: ethChainId, account: address }))
      })()
    }
  }, [adapter, wallet, lpBip44Params])

  useEffect(() => {
    // getting fox-eth lp token data
    ;(async () => {
      // getting fox-eth lp token balances
      await fetchAllStakingOpportunitiesMetadata()
      // getting fox farm contract data
      ethAccountIds.forEach(accountId => fetchAllStakingOpportunitiesUserData(accountId))
    })()
  }, [ethAccountIds, dispatch])

  const transaction = useAppSelector(gs => selectTxById(gs, ongoingTxId ?? ''))

  const handleOngoingTxIdChange = useCallback(
    (type: 'farming' | 'lp', txid: string, contractAddress?: string) => {
      const accountId = type === 'farming' ? farmingAccountId : lpAccountId
      const accountAddress = fromAccountId(
        type === 'farming' ? farmingAccountId ?? '' : lpAccountId ?? '',
      ).account
      setOngoingTxId(serializeTxIndex(accountId ?? '', txid, accountAddress))
      if (contractAddress) setOngoingTxContractAddress(contractAddress)
    },
    [lpAccountId, farmingAccountId],
  )

  const handleOngoingFarmingTxIdChange = useCallback(
    (txid: string, contractAddress?: string) => {
      if (!farmingAccountId) return
      handleOngoingTxIdChange('farming', txid, contractAddress)
    },
    [farmingAccountId, handleOngoingTxIdChange],
  )

  const handleOngoingLpTxIdChange = useCallback(
    (txid: string, contractAddress?: string) => {
      if (!lpAccountId) return
      handleOngoingTxIdChange('lp', txid, contractAddress)
    },
    [handleOngoingTxIdChange, lpAccountId],
  )

  useEffect(() => {
    if (farmingAccountId && transaction && transaction.status !== TxStatus.Pending) {
      if (transaction.status === TxStatus.Confirmed) {
        moduleLogger.info('Refetching fox lp/farming opportunities')
        refetchFoxEthLpAccountData()
        if (ongoingTxContractAddress)
          dispatch(
            opportunitiesApi.endpoints.getOpportunityUserData.initiate(
              {
                accountId: farmingAccountId ?? '',
                opportunityId: ongoingTxContractAddress as LpId,
                opportunityType: DefiType.Staking,
                defiType: DefiType.Staking,
              },
              // Any previous query without portfolio loaded will be rejected
              // The first successful one will be cached unless forceRefetch is overriden with queryOptions
              { forceRefetch: true },
            ),
          )
        setOngoingTxId(null)
        setOngoingTxContractAddress(null)
      }
    }
  }, [
    dispatch,
    farmingAccountId,
    ongoingTxContractAddress,
    refetchFoxEthLpAccountData,
    transaction,
  ])

  const value = useMemo(
    () => ({
      farmingAccountId,
      lpAccountId,
      onOngoingLpTxIdChange: handleOngoingLpTxIdChange,
      onOngoingFarmingTxIdChange: handleOngoingFarmingTxIdChange,
      setFarmingAccountId,
      setLpAccountId,
    }),
    [
      farmingAccountId,
      handleOngoingFarmingTxIdChange,
      handleOngoingLpTxIdChange,
      lpAccountId,
      setLpAccountId,
    ],
  )

  return <FoxEthContext.Provider value={value}>{children}</FoxEthContext.Provider>
}

export const useFoxEth = () => useContext(FoxEthContext)
