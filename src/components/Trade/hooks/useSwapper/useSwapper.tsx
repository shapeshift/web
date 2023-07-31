import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type {
  evm,
  EvmChainAdapter,
  UtxoBaseAdapter,
  UtxoChainId,
} from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useDonationAmountBelowMinimum } from 'components/Trade/hooks/useDonationAmountBelowMinimum'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import type { BuildTradeInputCommonArgs } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bn } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { SwapperManager } from 'lib/swapper/manager/SwapperManager'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/utils/constants'
import {
  buildAndBroadcast,
  getApproveContractData,
  getErc20Allowance,
  getFees,
  isEvmChainAdapter,
} from 'lib/utils/evm'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import {
  selectAssetsSortedByMarketCapUserCurrencyBalanceAndName,
  selectBIP44ParamsByAccountId,
  selectNonNftAssetIds,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import {
  selectActiveSwapperWithMetadata,
  selectBuyAsset,
  selectBuyAssetAccountId,
  selectQuote,
  selectReceiveAddress,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
  selectSellAssetAccountId,
  selectSlippage,
  selectSwapperDefaultAffiliateBps,
} from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

import { isCosmosSdkSwap, isEvmSwap, isUtxoSwap } from './typeGuards'

/*
The Swapper hook is responsible for providing computed swapper state to consumers.
It does not mutate state.
*/
export const useSwapper = () => {
  const activeQuote = useSwapperStore(selectQuote)
  const sellAssetAccountId = useSwapperStore(selectSellAssetAccountId)
  const buyAssetAccountId = useSwapperStore(selectBuyAssetAccountId)
  const buyAsset = useSwapperStore(selectBuyAsset)
  const sellAsset = useSwapperStore(selectSellAsset)
  const defaultAffiliateBps = useSwapperStore(selectSwapperDefaultAffiliateBps)
  const activeSwapperWithMetadata = useSwapperStore(selectActiveSwapperWithMetadata)
  const slippage = useSwapperStore(selectSlippage)
  const sellAmountCryptoPrecision = useSwapperStore(selectSellAmountCryptoPrecision)
  const receiveAddress = useSwapperStore(selectReceiveAddress)

  // Selectors
  const flags = useSelector(selectFeatureFlags)
  const nonNftAssetIds = useSelector(selectNonNftAssetIds)
  const sortedAssets = useSelector(selectAssetsSortedByMarketCapUserCurrencyBalanceAndName)

  // Hooks
  const [swapperManager, setSwapperManager] = useState<SwapperManager>()
  const wallet = useWallet().state.wallet
  const isDonationAmountBelowMinimum = useDonationAmountBelowMinimum()

  // Selectors
  const supportedSellAssetsByMarketCap = useMemo(() => {
    if (!swapperManager) return []

    const sellableAssetIds = swapperManager.getSupportedSellableAssetIds({
      nonNftAssetIds,
    })

    const sellableAssetIdsSet: Set<AssetId> = new Set(sellableAssetIds)
    const swapperSupportedSellAssets = sortedAssets.filter(asset =>
      sellableAssetIdsSet.has(asset.assetId),
    )
    const walletSupportedAssets = swapperSupportedSellAssets.filter(asset =>
      walletSupportsChain({ chainId: asset.chainId, wallet }),
    )

    return walletSupportedAssets
  }, [swapperManager, nonNftAssetIds, sortedAssets, wallet])

  const supportedBuyAssetsByMarketCap = useMemo(() => {
    const sellAssetId = sellAsset?.assetId
    if (sellAssetId === undefined || !swapperManager) return []

    const buyableAssetIds = swapperManager.getSupportedBuyAssetIdsFromSellId({
      nonNftAssetIds,
      sellAssetId,
    })

    const buyableAssetIdsSet: Set<AssetId> = new Set(buyableAssetIds)

    return sortedAssets.filter(asset => buyableAssetIdsSet.has(asset.assetId))
  }, [sortedAssets, sellAsset?.assetId, nonNftAssetIds, swapperManager])

  const sellAssetAccountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetId(state, { assetId: sellAsset?.assetId ?? '' }),
  )
  const sellAccountFilter = useMemo(
    () => ({ accountId: sellAssetAccountId ?? sellAssetAccountIds[0] }),
    [sellAssetAccountId, sellAssetAccountIds],
  )

  const sellAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, sellAccountFilter),
  )

  const sellAccountBip44Params = useAppSelector(state =>
    selectBIP44ParamsByAccountId(state, sellAccountFilter),
  )

  const buyAssetAccountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetId(state, { assetId: buyAsset?.assetId ?? '' }),
  )
  const buyAccountFilter = useMemo(
    () => ({ accountId: buyAssetAccountId ?? buyAssetAccountIds[0] }),
    [buyAssetAccountId, buyAssetAccountIds],
  )

  const buyAccountBip44Params = useAppSelector(state =>
    selectBIP44ParamsByAccountId(state, buyAccountFilter),
  )

  const approve = useCallback(
    (buildCustomTxInput: evm.BuildCustomTxInput): Promise<string> => {
      const adapterManager = getChainAdapterManager()
      const adapter = adapterManager.get(sellAsset.chainId)

      if (!wallet) throw new Error('no wallet available')
      if (!adapter || !isEvmChainAdapter(adapter))
        throw Error(`no valid EVM chain adapter found for chain Id: ${sellAsset.chainId}`)

      return buildAndBroadcast({ buildCustomTxInput, adapter })
    },
    [sellAsset.chainId, wallet],
  )

  const getTrade = useCallback(
    async ({ affiliateBps }: { affiliateBps?: string } = {}) => {
      if (!wallet) throw new Error('no wallet available')
      if (!sellAccountBip44Params) throw new Error('Missing sellAccountBip44Params')
      const walletSupportsBuyAsset = walletSupportsChain({ chainId: buyAsset.chainId, wallet })
      if (!buyAccountBip44Params && walletSupportsBuyAsset)
        throw new Error('Missing buyAccountBip44Params')
      if (!sellAccountMetadata) throw new Error('Missing sellAccountMetadata')

      const activeSwapper = activeSwapperWithMetadata?.swapper
      const activeQuote = activeSwapperWithMetadata?.quote

      if (!activeSwapper) throw new Error('No swapper available')
      if (!activeQuote) throw new Error('No quote available')
      if (!buyAsset) throw new Error('Missing buyAsset')
      if (!sellAsset) throw new Error('No sellAsset')
      if (!sellAssetAccountId) throw new Error('Missing sellAssetAccountId')
      if (!sellAmountCryptoPrecision) throw new Error('Missing sellTradeAsset.amount')
      if (!receiveAddress) throw new Error('Missing receiveAddress')

      const buildTradeCommonArgs: BuildTradeInputCommonArgs = {
        sellAmountBeforeFeesCryptoBaseUnit: toBaseUnit(
          sellAmountCryptoPrecision,
          sellAsset.precision,
        ),
        sellAsset,
        buyAsset,
        receiveAddress,
        slippage,
        affiliateBps: isDonationAmountBelowMinimum ? '0' : affiliateBps ?? defaultAffiliateBps,
        allowMultiHop: flags.MultiHopTrades,
      }

      const {
        accountType,
        bip44Params: { accountNumber },
      } = sellAccountMetadata

      if (isUtxoSwap(sellAsset.chainId)) {
        if (!accountType) throw new Error('accountType required')

        const sellAssetChainAdapter = getChainAdapterManager().get(
          sellAsset.chainId,
        ) as unknown as UtxoBaseAdapter<UtxoChainId>

        const sendAddress = await sellAssetChainAdapter.getAddress({
          accountNumber,
          wallet,
        })

        const { xpub } = await sellAssetChainAdapter.getPublicKey(
          wallet,
          accountNumber,
          accountType,
        )

        return activeSwapper.buildTrade({
          ...buildTradeCommonArgs,
          chainId: sellAsset.chainId,
          accountNumber,
          accountType,
          xpub,
          sendAddress,
          wallet,
        })
      } else if (isEvmSwap(sellAsset.chainId) || isCosmosSdkSwap(sellAsset.chainId)) {
        const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())
        const sellAssetChainAdapter = getChainAdapterManager().get(
          sellAsset.chainId,
        ) as unknown as EvmChainAdapter

        const sendAddress = await sellAssetChainAdapter.getAddress({
          accountNumber,
          wallet,
        })

        return activeSwapper.buildTrade({
          ...buildTradeCommonArgs,
          chainId: sellAsset.chainId,
          accountNumber: sellAccountBip44Params.accountNumber,
          receiveAccountNumber: buyAccountBip44Params?.accountNumber,
          supportsEIP1559,
          sendAddress,
          wallet,
        })
      } else {
        throw new Error('unsupported sellAsset.chainId')
      }
    },
    [
      wallet,
      sellAccountBip44Params,
      buyAsset,
      buyAccountBip44Params,
      sellAccountMetadata,
      activeSwapperWithMetadata?.swapper,
      activeSwapperWithMetadata?.quote,
      sellAsset,
      sellAssetAccountId,
      sellAmountCryptoPrecision,
      receiveAddress,
      slippage,
      isDonationAmountBelowMinimum,
      defaultAffiliateBps,
      flags.MultiHopTrades,
    ],
  )

  const checkApprovalNeeded = useCallback(async () => {
    const adapterManager = getChainAdapterManager()
    const adapter = adapterManager.get(sellAsset.chainId)

    if (!adapter) throw Error(`no chain adapter found for chain Id: ${sellAsset.chainId}`)
    if (!wallet) throw new Error('no wallet available')
    if (!activeQuote) throw new Error('no activeQuote available')

    // No approval needed for selling a fee asset
    if (sellAsset.assetId === adapter.getFeeAssetId()) {
      return false
    }

    const from = await adapter.getAddress({
      wallet,
      accountNumber: activeQuote.steps[0].accountNumber,
    })

    const { assetReference: sellAssetContractAddress } = fromAssetId(sellAsset.assetId)

    const allowanceOnChainCryptoBaseUnit = await getErc20Allowance({
      address: sellAssetContractAddress,
      spender: activeQuote.steps[0].allowanceContract,
      from,
      chainId: sellAsset.chainId,
    })

    return bn(allowanceOnChainCryptoBaseUnit).lt(
      activeQuote.steps[0].sellAmountBeforeFeesCryptoBaseUnit,
    )
  }, [activeQuote, sellAsset.assetId, sellAsset.chainId, wallet])

  const getApprovalTxData = useCallback(
    async (
      isExactAllowance: boolean,
    ): Promise<{
      networkFeeCryptoBaseUnit: string
      buildCustomTxInput: evm.BuildCustomTxInput
    }> => {
      const adapterManager = getChainAdapterManager()
      const adapter = adapterManager.get(sellAsset.chainId)

      if (!activeQuote) throw new Error('no activeQuote available')
      if (!wallet) throw new Error('no wallet available')
      if (!isEvmChainAdapter(adapter))
        throw Error(`no valid EVM chain adapter found for chain Id: ${sellAsset.chainId}`)

      const approvalAmountCryptoBaseUnit = isExactAllowance
        ? activeQuote.steps[0].sellAmountBeforeFeesCryptoBaseUnit
        : MAX_ALLOWANCE

      const to = fromAssetId(sellAsset.assetId).assetReference

      const data = getApproveContractData({
        approvalAmountCryptoBaseUnit,
        spender: activeQuote.steps[0].allowanceContract,
        to,
      })

      const args = {
        accountNumber: activeQuote.steps[0].accountNumber,
        adapter,
        data,
        to,
        value: '0',
        wallet,
      }

      const { networkFeeCryptoBaseUnit, ...fees } = await getFees(args)

      return {
        networkFeeCryptoBaseUnit,
        buildCustomTxInput: { ...args, ...fees },
      }
    },
    [activeQuote, sellAsset.assetId, sellAsset.chainId, wallet],
  )

  useEffect(() => {
    if (!flags) return

    getSwapperManager(flags).then(setSwapperManager)
  }, [flags])

  return {
    supportedSellAssetsByMarketCap,
    supportedBuyAssetsByMarketCap,
    getTrade,
    approve,
    getApprovalTxData,
    checkApprovalNeeded,
    isSwapperInitialized: swapperManager !== undefined,
  }
}
