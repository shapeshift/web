import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { getReceiveAddress } from 'components/Trade/hooks/useSwapper/utils'
import { SwapperActionType, useSwapperState } from 'components/Trade/swapperProvider'
import type { TS } from 'components/Trade/types'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/portfolioSlice/selectors'
import { isUtxoAccountId } from 'state/slices/portfolioSlice/utils'
import { useAppSelector } from 'state/store'

export const useReceiveAddress = () => {
  // Form hooks
  const { control } = useFormContext<TS>()
  const buyAssetAccountId = useWatch({ control, name: 'buyAssetAccountId' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })

  // Hooks
  const wallet = useWallet().state.wallet
  const { dispatch } = useSwapperState()

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
        dispatch({ type: SwapperActionType.SET_RECEIVE_ADDRESS, payload: receiveAddress })
      } catch (e) {
        dispatch({ type: SwapperActionType.SET_RECEIVE_ADDRESS, payload: undefined })
      }
    })()
  }, [buyTradeAsset?.asset, dispatch, getReceiveAddressFromBuyAsset])

  return { getReceiveAddressFromBuyAsset }
}
