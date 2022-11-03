import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAccountId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import isEqual from 'lodash/isEqual'
import React, { createContext, useContext, useMemo } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { foxEthApi } from 'state/slices/foxEthSlice/foxEthSlice'
import {
  fetchAllOpportunitiesMetadata,
  fetchAllOpportunitiesUserData,
  fetchAllStakingOpportunitiesMetadata,
  fetchAllStakingOpportunitiesUserData,
} from 'state/slices/opportunitiesSlice/thunks'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAccountIdsByAssetId,
  selectAssetById,
  selectBIP44ParamsByAccountId,
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
  farmingAccountId: Nullable<AccountId>
  setFarmingAccountId: (accountId: AccountId) => void
  lpAccountId: Nullable<AccountId>
  setLpAccountId: (accountId: AccountId) => void
  lpAccountAddress: string
  farmingAccountAddress: string
  onOngoingFarmingTxIdChange: (txid: string, contractAddress?: string) => Promise<void>
  onOngoingLpTxIdChange: (txid: string, contractAddress?: string) => Promise<void>
}

const FoxEthContext = createContext<IFoxEthContext>({
  lpAccountId: null,
  farmingAccountId: null,
  setLpAccountId: _accountId => {},
  setFarmingAccountId: _accountId => {},
  lpAccountAddress: '',
  farmingAccountAddress: '',
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
  const [lpAccountAddress, setLpAccountAddress] = useState<string>('')
  const [farmingAccountAddress, setFarmingAccountAddress] = useState<string>('')
  const [farmingAccountId, setFarmingAccountId] = useState<Nullable<AccountId>>(null)
  const [lpAccountId, setLpAccountId] = useState<Nullable<AccountId>>(null)

  const filter = useMemo(() => ({ assetId: ethAssetId }), [])

  // TODO(gomes): deepEqualOutputFn should happen on the selector itself and give us the same reference every call but it somehow doesn't
  // Remove the equalityFn second arg here after we figure out why
  const ethAccountIds = useAppSelector(state => selectAccountIdsByAssetId(state, filter), isEqual)

  const refetchFoxEthLpAccountData = useCallback(async () => {
    await Promise.all(
      ethAccountIds.map(async accountId => fetchAllOpportunitiesUserData(accountId)),
    )
  }, [ethAccountIds])

  useEffect(() => {
    ;(async () => {
      await fetchAllOpportunitiesMetadata().catch(e => moduleLogger.error(e))
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
        // eth.getAddress and similar return a checksummed address, but state opportunities aren't
        setLpAccountAddress(address.toLowerCase())
      })()
    }
  }, [adapter, wallet, lpBip44Params])

  useEffect(() => {
    if (!lpAccountId) return
    const lpAccountAddress = fromAccountId(lpAccountId).account
    setLpAccountAddress(lpAccountAddress)
  }, [lpAccountId])

  useEffect(() => {
    if (!farmingAccountId) return
    const farmingAccountAddress = fromAccountId(farmingAccountId).account
    setFarmingAccountAddress(farmingAccountAddress)
  }, [farmingAccountId])

  // this hook handles the data we need from the farming opportunities
  useEffect(() => {
    // getting fox-eth lp token data
    ;(async () => {
      // getting fox-eth lp token balances
      await fetchAllStakingOpportunitiesMetadata()
      // getting fox farm contract data
      await ethAccountIds.map(
        async accountId => await fetchAllStakingOpportunitiesUserData(accountId),
      )
    })()
  }, [ethAccountIds, dispatch])

  const transaction = useAppSelector(gs => selectTxById(gs, ongoingTxId ?? ''))

  const handleOngoingTxIdChange = useCallback(
    async (type: 'farming' | 'lp', txid: string, contractAddress?: string) => {
      const accountId = type === 'farming' ? farmingAccountId : lpAccountId
      const accountAddress = type === 'farming' ? farmingAccountAddress : lpAccountAddress
      setOngoingTxId(serializeTxIndex(accountId ?? '', txid, accountAddress))
      if (contractAddress) setOngoingTxContractAddress(contractAddress)
    },
    [lpAccountId, lpAccountAddress, farmingAccountId, farmingAccountAddress],
  )

  const handleOngoingFarmingTxIdChange = useCallback(
    async (txid: string, contractAddress?: string) => {
      if (!farmingAccountAddress) return
      handleOngoingTxIdChange('farming', txid, contractAddress)
    },
    [farmingAccountAddress, handleOngoingTxIdChange],
  )

  const handleOngoingLpTxIdChange = useCallback(
    async (txid: string, contractAddress?: string) => {
      if (!lpAccountAddress) return
      handleOngoingTxIdChange('lp', txid, contractAddress)
    },
    [lpAccountAddress, handleOngoingTxIdChange],
  )

  useEffect(() => {
    if (farmingAccountAddress && transaction && transaction.status !== TxStatus.Pending) {
      if (transaction.status === TxStatus.Confirmed) {
        moduleLogger.info('Refetching fox lp/farming opportunities')
        refetchFoxEthLpAccountData()
        if (ongoingTxContractAddress)
          dispatch(
            getOpportunityUserData.initiate(
              {
                accountId,
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
    farmingAccountAddress,
    ongoingTxContractAddress,
    refetchFoxEthLpAccountData,
    transaction,
  ])

  const value = useMemo(
    () => ({
      farmingAccountAddress,
      farmingAccountId,
      lpAccountAddress,
      lpAccountId,
      onOngoingLpTxIdChange: handleOngoingLpTxIdChange,
      onOngoingFarmingTxIdChange: handleOngoingFarmingTxIdChange,
      setFarmingAccountId,
      setLpAccountId,
      setLpAccountAddress,
    }),
    [
      farmingAccountAddress,
      farmingAccountId,
      handleOngoingFarmingTxIdChange,
      handleOngoingLpTxIdChange,
      lpAccountAddress,
      lpAccountId,
      setLpAccountAddress,
      setLpAccountId,
    ],
  )

  return <FoxEthContext.Provider value={value}>{children}</FoxEthContext.Provider>
}

export const useFoxEth = () => useContext(FoxEthContext)
