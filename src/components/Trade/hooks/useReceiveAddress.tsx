import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo } from 'react'
import { getReceiveAddress } from 'components/Trade/hooks/useSwapper/utils'
import { useSwapperState } from 'components/Trade/SwapperProvider/swapperProvider'
import { SwapperActionType } from 'components/Trade/SwapperProvider/types'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/portfolioSlice/selectors'
import { isUtxoAccountId } from 'state/slices/portfolioSlice/utils'
import { useAppSelector } from 'state/store'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const useReceiveAddress = () => {
  // Hooks
  const wallet = useWallet().state.wallet
  const { dispatch: swapperDispatch } = useSwapperState()

  const buyTradeAsset = useSwapperStore(state => state.buyTradeAsset)
  const buyAssetAccountId = useSwapperStore(state => state.buyAssetAccountId)

  // Constants
  const buyAsset = buyTradeAsset?.asset

  // Selectors
  const buyAssetAccountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetId(state, { assetId: buyAsset?.assetId ?? '' }),
  )

  const buyAccountFilter = useMemo(
    () => ({ accountId: buyAssetAccountId ?? buyAssetAccountIds[0] }),
    [buyAssetAccountId, buyAssetAccountIds],
  )

  const buyAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, buyAccountFilter),
  )

  const getReceiveAddressFromBuyAsset = useCallback(
    async (buyAsset: Asset) => {
      if (!buyAssetAccountId) return
      if (!buyAccountMetadata) return
      if (isUtxoAccountId(buyAssetAccountId) && !buyAccountMetadata.accountType)
        throw new Error(`Missing accountType for UTXO account ${buyAssetAccountId}`)
      const buyAssetChainId = buyAsset.chainId
      const buyAssetAccountChainId = fromAccountId(buyAssetAccountId).chainId
      /**
       * do NOT remove
       * super dangerous - don't use the wrong bip44 params to generate receive addresses
       */
      if (buyAssetChainId !== buyAssetAccountChainId) return
      const receiveAddress = await getReceiveAddress({
        asset: buyAsset,
        wallet,
        accountMetadata: buyAccountMetadata,
      })
      return receiveAddress
    },
    [buyAssetAccountId, buyAccountMetadata, wallet],
  )

  // Set the receiveAddress when the buy asset changes
  useEffect(() => {
    const buyAsset = buyTradeAsset?.asset
    if (!buyAsset) return
    ;(async () => {
      try {
        const receiveAddress = await getReceiveAddressFromBuyAsset(buyAsset)
        swapperDispatch({ type: SwapperActionType.SET_VALUES, payload: { receiveAddress } })
      } catch (e) {
        swapperDispatch({
          type: SwapperActionType.SET_VALUES,
          payload: { receiveAddress: undefined },
        })
      }
    })()
  }, [buyTradeAsset?.asset, swapperDispatch, getReceiveAddressFromBuyAsset])

  return { getReceiveAddressFromBuyAsset }
}
