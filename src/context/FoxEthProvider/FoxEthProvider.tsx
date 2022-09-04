import { AccountId, ethAssetId, ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import React, { createContext, useContext, useMemo } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { foxEthApi } from 'state/slices/foxEthSlice/foxEthSlice'
import {
  selectAssetById,
  selectFirstAccountSpecifierByChainId,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

const moduleLogger = logger.child({ namespace: ['FoxEthContext'] })

export type FoxFarmingEarnOpportunityType = {
  unclaimedRewards: string
  isVisible?: boolean
} & EarnOpportunityType

type FoxEthProviderProps = {
  children: React.ReactNode
}

type IFoxLpAndFarmingOpportunitiesContext = {
  accountId: AccountId | null
  setAccountId: (accountId: AccountId) => void
  accountAddress: string | null
  onOngoingTxIdChange: (txid: string, contractAddress?: string) => Promise<void>
}

const FoxLpAndFarmingOpportunitiesContext = createContext<IFoxLpAndFarmingOpportunitiesContext>({
  setAccountId: _accountId => {},
  accountId: null,
  accountAddress: null,
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
  const [ongoingTxId, setOngoingTxId] = useState<string | null>(null)
  const [ongoingTxContractAddress, setOngoingTxContractAddress] = useState<string | null>(null)
  const [accountAddress, setAccountAddress] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<AccountId | null>(null)
  const reduxDispatch = useDispatch()

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
        reduxDispatch(
          foxEthApi.endpoints.getFoxEthLpWalletData.initiate(
            { ethWalletAddress: accountAddress },
            { forceRefetch: true },
          ),
        )
        if (ongoingTxContractAddress)
          reduxDispatch(
            foxEthApi.endpoints.getFoxFarmingContractWalletData.initiate(
              { ethWalletAddress: accountAddress, contractAddress: ongoingTxContractAddress },
              { forceRefetch: true },
            ),
          )
        setOngoingTxId(null)
        setOngoingTxContractAddress(null)
      }
    }
  }, [accountAddress, ongoingTxContractAddress, reduxDispatch, transaction])

  const value = useMemo(
    () => ({
      accountId,
      setAccountId,
      accountAddress,
      onOngoingTxIdChange: handleOngoingTxIdChange,
    }),
    [accountId, setAccountId, accountAddress, handleOngoingTxIdChange],
  )

  return (
    <FoxLpAndFarmingOpportunitiesContext.Provider value={value}>
      {children}
    </FoxLpAndFarmingOpportunitiesContext.Provider>
  )
}

export const useFoxEth = () => useContext(FoxLpAndFarmingOpportunitiesContext)
