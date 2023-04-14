import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import type {
  GetSwappersWithQuoteMetadataReturn,
  SwapperWithQuoteMetadata,
} from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { getIsTradingActiveApi } from 'state/apis/swapper/getIsTradingActiveApi'
import { getSwappersApi } from 'state/apis/swapper/getSwappersApi'
import { selectAvailableSwapperApiMostRecentQueryTimestamp } from 'state/apis/swapper/selectors'
import { selectFeeAssetByChainId } from 'state/slices/assetsSlice/selectors'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { store, useAppDispatch, useAppSelector } from 'state/store'
import { selectBuyAsset, selectSellAsset } from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

// A helper hook to get the available swappers from the RTK API, mapping the SwapperTypes to swappers
export const useAvailableSwappers = () => {
  const [currentRequestStartedTimeStamp, setCurrentRequestStartedTimeStamp] = useState<number>()
  const [isCachedResult, setIsCachedResult] = useState(false)

  // Form hooks
  const { tradeQuoteArgs } = useTradeQuoteService()

  const updateAvailableSwappersWithMetadata = useSwapperStore(
    state => state.updateAvailableSwappersWithMetadata,
  )
  const updateActiveSwapperWithMetadata = useSwapperStore(
    state => state.updateActiveSwapperWithMetadata,
  )
  const buyAsset = useSwapperStore(selectBuyAsset)
  const sellAsset = useSwapperStore(selectSellAsset)
  const updateFees = useSwapperStore(state => state.updateFees)
  const updateTradeAmountsFromQuote = useSwapperStore(state => state.updateTradeAmountsFromQuote)
  const mostRecentQueryStart = useSelector(selectAvailableSwapperApiMostRecentQueryTimestamp)

  // Constants
  const buyAssetId = buyAsset?.assetId
  const sellAssetId = sellAsset?.assetId
  const sellAssetChainId = sellAsset?.chainId

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, sellAssetChainId ?? ''))

  const [swappersWithQuoteMetadata, setSwappersWithQuoteMetadata] =
    useState<GetSwappersWithQuoteMetadataReturn>()
  const dispatch = useAppDispatch()

  const { getIsTradingActive } = getIsTradingActiveApi.endpoints

  const featureFlags = useAppSelector(selectFeatureFlags)
  const { getAvailableSwappers } = getSwappersApi.endpoints

  /*
     This effect is responsible for fetching the available swappers for a given trade pair and corresponding args.
     We track if the result is cached to know whether to apply the race condition check - we don't mind if a cached
     result is not fresh (to a small some degree), but we do if a non-cached result is not fresh.
   */
  useEffect(() => {
    ;(async () => {
      const cachedResponseSelector =
        feeAsset && tradeQuoteArgs
          ? getAvailableSwappers.select({ ...tradeQuoteArgs, feeAsset })
          : undefined
      const isCachedResultAvailableForArgs = cachedResponseSelector
        ? [QueryStatus.fulfilled, QueryStatus.pending].includes(
            cachedResponseSelector(store.getState())?.status,
          )
        : false
      setIsCachedResult(isCachedResultAvailableForArgs)
      const availableSwapperTypesWithQuoteMetadataResponse =
        tradeQuoteArgs && feeAsset
          ? await dispatch(
              getAvailableSwappers.initiate({
                ...tradeQuoteArgs,
                feeAsset,
              }),
            )
          : undefined

      const availableSwapperTypesWithQuoteMetadata =
        availableSwapperTypesWithQuoteMetadataResponse?.data
      setCurrentRequestStartedTimeStamp(
        availableSwapperTypesWithQuoteMetadataResponse?.startedTimeStamp,
      )

      const swapperManager = await getSwapperManager(featureFlags)
      const swappers = swapperManager.swappers
      const availableSwappersWithQuoteMetadata = availableSwapperTypesWithQuoteMetadata
        ?.map(s => {
          const swapper = swappers.get(s.swapperType)
          return swapper
            ? {
                swapper,
                quote: s.quote,
                inputOutputRatio: s.inputOutputRatio,
              }
            : undefined
        })
        .filter(isSome)
      // Handle a race condition between form state and useTradeQuoteService
      if (
        tradeQuoteArgs?.buyAsset.assetId === buyAssetId &&
        tradeQuoteArgs?.sellAsset.assetId === sellAssetId
      ) {
        setSwappersWithQuoteMetadata(availableSwappersWithQuoteMetadata)
      }
    })()
  }, [
    buyAssetId,
    dispatch,
    featureFlags,
    feeAsset,
    getAvailableSwappers,
    mostRecentQueryStart,
    sellAssetId,
    tradeQuoteArgs,
  ])

  useEffect(() => {
    ;(async () => {
      const isCurrentResponseFresh = bnOrZero(currentRequestStartedTimeStamp).gte(
        mostRecentQueryStart ?? 0,
      )

      // Early return if we don't have a response, or the response didn't come from the cache, but is stale (race condition).
      if (!swappersWithQuoteMetadata || (!isCurrentResponseFresh && !isCachedResult)) return
      /*
        The available swappers endpoint returns all available swappers for a given trade pair, ordered by rate, including halted.
        A halted swapper may well have the best rate, but we don't want to show it unless there are none other available.
       */
      const active: SwapperWithQuoteMetadata[] = []
      const halted: SwapperWithQuoteMetadata[] = []
      await Promise.all(
        swappersWithQuoteMetadata.map(async swapperWithQuoteMetadata => {
          const isActive = await (async () => {
            const activeSwapper = swapperWithQuoteMetadata.swapper
            const isThorSwapper = activeSwapper.name === SwapperName.Thorchain
            // Avoid unnecessary network requests unless we have a THORChain swapper
            if (isThorSwapper) {
              const isTradingActiveOnSellPoolResult =
                sellAssetId &&
                activeSwapper &&
                (
                  await dispatch(
                    getIsTradingActive.initiate({
                      assetId: sellAssetId,
                      swapperName: activeSwapper.name,
                    }),
                  )
                ).data

              const isTradingActiveOnBuyPoolResult =
                buyAssetId &&
                activeSwapper &&
                (
                  await dispatch(
                    getIsTradingActive.initiate({
                      assetId: buyAssetId,
                      swapperName: activeSwapper.name,
                    }),
                  )
                ).data
              return !!isTradingActiveOnSellPoolResult && !!isTradingActiveOnBuyPoolResult
            } else return true
          })()

          if (isActive) {
            active.push(swapperWithQuoteMetadata)
          } else {
            halted.push(swapperWithQuoteMetadata)
          }
        }),
      )

      /*
        If we have active swappers, show only them. Else, show any halted swappers so the user knows the trade pair
        is actually supported by us, it's just currently halted.
       */
      const swappersToDisplay = active.length > 0 ? active : halted
      const activeSwapperWithQuoteMetadata = swappersToDisplay?.[0]
      updateAvailableSwappersWithMetadata(swappersToDisplay)
      updateActiveSwapperWithMetadata(activeSwapperWithQuoteMetadata)
      updateTradeAmountsFromQuote()
      feeAsset && updateFees(feeAsset)
    })()
  }, [
    buyAssetId,
    currentRequestStartedTimeStamp,
    dispatch,
    feeAsset,
    getIsTradingActive,
    isCachedResult,
    mostRecentQueryStart,
    sellAssetId,
    swappersWithQuoteMetadata,
    updateActiveSwapperWithMetadata,
    updateAvailableSwappersWithMetadata,
    updateFees,
    updateTradeAmountsFromQuote,
  ])
}
