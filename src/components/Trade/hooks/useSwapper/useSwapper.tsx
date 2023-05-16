import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/chain-adapters'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useDonationAmountBelowMinimum } from 'components/Trade/hooks/useDonationAmountBelowMinimum'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bn } from 'lib/bignumber/bignumber'
import type { SwapperManager } from 'lib/swapper/manager/SwapperManager'
import { erc20AllowanceAbi } from 'lib/swapper/swappers/utils/abi/erc20Allowance-abi'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/utils/constants'
import {
  buildAndBroadcast,
  createBuildCustomTxInput,
  getApproveContractData,
  getERC20Allowance,
} from 'lib/swapper/swappers/utils/helpers/helpers'
import { isEvmChainAdapter } from 'lib/utils'
import { getWeb3InstanceByChainId } from 'lib/web3-instance'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import {
  selectAssetIds,
  selectAssetsSortedByMarketCapFiatBalanceAndName,
  selectBIP44ParamsByAccountId,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import {
  selectBuyAsset,
  selectBuyAssetAccountId,
  selectGetTradeForWallet,
  selectQuote,
  selectSellAsset,
  selectSellAssetAccountId,
  selectSwapperDefaultAffiliateBps,
} from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

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
  const getTradeForWallet = useSwapperStore(selectGetTradeForWallet)
  const defaultAffiliateBps = useSwapperStore(selectSwapperDefaultAffiliateBps)

  // Selectors
  const flags = useSelector(selectFeatureFlags)
  const assetIds = useSelector(selectAssetIds)
  const sortedAssets = useSelector(selectAssetsSortedByMarketCapFiatBalanceAndName)

  // Hooks
  const [swapperManager, setSwapperManager] = useState<SwapperManager>()
  const wallet = useWallet().state.wallet
  const isDonationAmountBelowMinimum = useDonationAmountBelowMinimum()

  // Selectors
  const supportedSellAssetsByMarketCap = useMemo(() => {
    if (!swapperManager) return []

    const sellableAssetIds = swapperManager.getSupportedSellableAssetIds({
      assetIds,
    })

    const sellableAssetIdsSet: Set<AssetId> = new Set(sellableAssetIds)

    return sortedAssets.filter(asset => sellableAssetIdsSet.has(asset.assetId))
  }, [sortedAssets, assetIds, swapperManager])

  const supportedBuyAssetsByMarketCap = useMemo(() => {
    const sellAssetId = sellAsset?.assetId
    if (sellAssetId === undefined || !swapperManager) return []

    const buyableAssetIds = swapperManager.getSupportedBuyAssetIdsFromSellId({
      assetIds,
      sellAssetId,
    })

    const buyableAssetIdsSet: Set<AssetId> = new Set(buyableAssetIds)

    return sortedAssets.filter(asset => buyableAssetIdsSet.has(asset.assetId))
  }, [sortedAssets, sellAsset?.assetId, assetIds, swapperManager])

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
    (buildCustomTxArgs: evm.BuildCustomTxInput): Promise<string> => {
      const adapterManager = getChainAdapterManager()
      const adapter = adapterManager.get(sellAsset.chainId)

      if (!wallet) throw new Error('no wallet available')
      if (!adapter || !isEvmChainAdapter(adapter))
        throw Error(`no valid EVM chain adapter found for chain Id: ${sellAsset.chainId}`)

      return buildAndBroadcast({
        buildCustomTxArgs,
        adapter,
        wallet,
      })
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

      const trade = await getTradeForWallet({
        wallet,
        sellAccountBip44Params,
        sellAccountMetadata,
        buyAccountBip44Params,
        affiliateBps: isDonationAmountBelowMinimum ? '0' : affiliateBps ?? defaultAffiliateBps,
      })
      return trade
    },
    [
      wallet,
      sellAccountBip44Params,
      buyAsset.chainId,
      buyAccountBip44Params,
      sellAccountMetadata,
      getTradeForWallet,
      isDonationAmountBelowMinimum,
      defaultAffiliateBps,
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

    const ownerAddress = await adapter.getAddress({
      wallet,
      accountNumber: activeQuote.accountNumber,
    })

    const { assetReference } = fromAssetId(sellAsset.assetId)
    const web3 = getWeb3InstanceByChainId(sellAsset.chainId)

    const allowanceOnChainCryptoBaseUnit = await getERC20Allowance({
      web3,
      erc20AllowanceAbi,
      address: assetReference,
      spenderAddress: activeQuote.allowanceContract,
      ownerAddress,
    })

    return bn(allowanceOnChainCryptoBaseUnit).lt(activeQuote.sellAmountBeforeFeesCryptoBaseUnit)
  }, [activeQuote, sellAsset.assetId, sellAsset.chainId, wallet])

  const createBuildApprovalTxInput = useCallback(
    (isExactAllowance: boolean): Promise<evm.BuildCustomTxInput> => {
      const adapterManager = getChainAdapterManager()
      const adapter = adapterManager.get(sellAsset.chainId)

      if (!activeQuote) throw new Error('no activeQuote available')
      if (!wallet) throw new Error('no wallet available')
      if (!adapter || !isEvmChainAdapter(adapter))
        throw Error(`no valid EVM chain adapter found for chain Id: ${sellAsset.chainId}`)

      const approvalAmountCryptoBaseUnit = isExactAllowance
        ? activeQuote.sellAmountBeforeFeesCryptoBaseUnit
        : MAX_ALLOWANCE

      const web3 = getWeb3InstanceByChainId(sellAsset.chainId)

      const { assetReference } = fromAssetId(sellAsset.assetId)

      const data = getApproveContractData({
        approvalAmountCryptoBaseUnit,
        spender: activeQuote.allowanceContract,
        to: assetReference,
        web3,
      })

      return createBuildCustomTxInput({
        accountNumber: activeQuote.accountNumber,
        adapter,
        to: assetReference,
        data,
        value: '0',
        wallet,
      })
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
    createBuildApprovalTxInput,
    checkApprovalNeeded,
  }
}
