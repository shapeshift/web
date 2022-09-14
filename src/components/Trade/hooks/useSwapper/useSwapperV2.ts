import { type Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { type Swapper, type UtxoSupportedChainIds, SwapperManager } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import {
  filterAssetsByIds,
  getFirstReceiveAddress,
  getUtxoParams,
  isSupportedNonUtxoSwappingChain,
  isSupportedUtxoSwappingChain,
} from 'components/Trade/hooks/useSwapper/utils'
import type { TS } from 'components/Trade/types'
import { type BuildTradeInputCommonArgs } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { toBaseUnit } from 'lib/math'
import { selectAccountSpecifiers } from 'state/slices/accountSpecifiersSlice/selectors'
import { selectAssetIds } from 'state/slices/assetsSlice/selectors'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'

const moduleLogger = logger.child({ namespace: ['useSwapper'] })

/*
The Swapper hook is responsible for providing computed swapper state to consumers.
It does not mutate state.
*/
export const useSwapper = () => {
  // Form hooks
  const { control } = useFormContext<TS>()
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const quote = useWatch({ control, name: 'quote' })
  const sellAssetAccountId = useWatch({ control, name: 'sellAssetAccountId' })

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset
  const buyAssetId = buyAsset?.assetId
  const sellAssetId = sellAsset?.assetId

  // Hooks
  const [swapperManager, setSwapperManager] = useState<SwapperManager>(() => new SwapperManager())
  const [bestTradeSwapper, setBestTradeSwapper] = useState<Swapper<KnownChainIds>>()
  const {
    state: { wallet },
  } = useWallet()
  const [receiveAddress, setReceiveAddress] = useState<string | null>()

  // Selectors
  const flags = useSelector(selectFeatureFlags)
  const assetIds = useSelector(selectAssetIds)
  const accountSpecifiersList = useSelector(selectAccountSpecifiers)

  // Callbacks
  const getSupportedSellableAssets = useCallback(
    (assets: Asset[]) => {
      const sellableAssetIds = swapperManager.getSupportedSellableAssetIds({
        assetIds,
      })
      return filterAssetsByIds(assets, sellableAssetIds)
    },
    [assetIds, swapperManager],
  )

  const getReceiveAddressFromBuyAsset = useCallback(
    async (buyAsset: Asset) => {
      const { chainId: receiveAddressChainId } = fromAssetId(buyAsset.assetId)
      const chainAdapter = getChainAdapterManager().get(receiveAddressChainId)
      if (!(chainAdapter && wallet)) return
      try {
        return await getFirstReceiveAddress({
          accountSpecifiersList,
          buyAsset,
          chainAdapter,
          wallet,
        })
      } catch (e) {
        moduleLogger.info(e, 'No receive address for buy asset, using default asset pair')
      }
    },
    [accountSpecifiersList, wallet],
  )

  const getSupportedBuyAssetsFromSellAsset = useCallback(
    (assets: Asset[]): Asset[] | undefined => {
      const sellAssetId = sellTradeAsset?.asset?.assetId
      const assetIds = assets.map(asset => asset.assetId)
      const supportedBuyAssetIds = sellAssetId
        ? swapperManager.getSupportedBuyAssetIdsFromSellId({
            assetIds,
            sellAssetId,
          })
        : undefined
      return supportedBuyAssetIds ? filterAssetsByIds(assets, supportedBuyAssetIds) : undefined
    },
    [swapperManager, sellTradeAsset],
  )

  const checkApprovalNeeded = useCallback(async (): Promise<boolean> => {
    if (!bestTradeSwapper) throw new Error('No swapper available')
    if (!wallet) throw new Error('No wallet available')
    if (!quote) throw new Error('No quote available')
    const { approvalNeeded } = await bestTradeSwapper.approvalNeeded({ quote, wallet })
    return approvalNeeded
  }, [bestTradeSwapper, quote, wallet])

  const getTrade = useCallback(async () => {
    if (!sellAsset) throw new Error('No sellAsset')
    if (!bestTradeSwapper) throw new Error('No swapper available')
    if (!sellTradeAsset?.amount) throw new Error('Missing sellTradeAsset.amount')
    if (!sellTradeAsset?.asset) throw new Error('Missing sellTradeAsset.asset')
    if (!buyTradeAsset?.asset) throw new Error('Missing buyTradeAsset.asset')
    if (!wallet) throw new Error('Missing wallet')
    if (!receiveAddress) throw new Error('Missing receiveAddress')
    if (!sellAssetAccountId) throw new Error('Missing sellAssetAccountId')

    const buildTradeCommonArgs: BuildTradeInputCommonArgs = {
      sellAmount: toBaseUnit(sellTradeAsset.amount, sellAsset.precision),
      sellAsset: sellTradeAsset?.asset,
      buyAsset: buyTradeAsset?.asset,
      sellAssetAccountNumber: 0, // TODO: remove hard coded accountId when multiple accounts are implemented
      wallet,
      sendMax: false,
      receiveAddress,
    }
    const sellAssetChainId = sellAsset.chainId
    if (isSupportedNonUtxoSwappingChain(sellAssetChainId)) {
      return bestTradeSwapper.buildTrade({
        ...buildTradeCommonArgs,
        chainId: sellAssetChainId,
      })
    } else if (isSupportedUtxoSwappingChain(sellAssetChainId)) {
      const { accountType, utxoParams } = getUtxoParams(sellAssetAccountId)
      if (!utxoParams?.bip44Params) throw new Error('no bip44Params')
      const sellAssetChainAdapter = getChainAdapterManager().get(
        sellAssetChainId,
      ) as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>
      const { xpub } = await sellAssetChainAdapter.getPublicKey(
        wallet,
        utxoParams.bip44Params,
        accountType,
      )
      return bestTradeSwapper.buildTrade({
        ...buildTradeCommonArgs,
        chainId: sellAssetChainId,
        bip44Params: utxoParams.bip44Params,
        accountType,
        xpub,
      })
    }
  }, [
    bestTradeSwapper,
    buyTradeAsset?.asset,
    receiveAddress,
    sellAsset,
    sellAssetAccountId,
    sellTradeAsset?.amount,
    sellTradeAsset?.asset,
    wallet,
  ])

  // useEffects
  // Set the bestTradeSwapper when the trade assets change
  useEffect(() => {
    if (buyAssetId && sellAssetId) {
      ;(async () => {
        const swapper = await swapperManager.getBestSwapper({
          buyAssetId,
          sellAssetId,
        })
        setBestTradeSwapper(swapper)
      })()
    }
  }, [buyAssetId, sellAssetId, swapperManager])

  useEffect(() => {
    ;(async () => {
      flags && setSwapperManager(await getSwapperManager(flags))
    })()
  }, [flags])

  // Set the receiveAddress when the buy asset changes
  useEffect(() => {
    const buyAsset = buyTradeAsset?.asset
    if (!buyAsset) return
    ;(async () => {
      // TODO: get the actual receive address instead of the first
      try {
        const receiveAddress = await getReceiveAddressFromBuyAsset(buyAsset)
        setReceiveAddress(receiveAddress)
      } catch (e) {
        setReceiveAddress(null)
      }
    })()
  }, [buyTradeAsset?.asset, getReceiveAddressFromBuyAsset])

  return {
    getSupportedSellableAssets,
    getSupportedBuyAssetsFromSellAsset,
    swapperManager,
    checkApprovalNeeded,
    bestTradeSwapper,
    receiveAddress,
    getReceiveAddressFromBuyAsset,
    getTrade,
  }
}
