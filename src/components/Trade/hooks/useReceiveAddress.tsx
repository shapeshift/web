import { fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo } from 'react'
import { getReceiveAddress } from 'components/Trade/hooks/useSwapper/utils'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import {
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/portfolioSlice/selectors'
import { isUtxoAccountId } from 'state/slices/portfolioSlice/utils'
import { useAppSelector } from 'state/store'
import { selectBuyAsset, selectBuyAssetAccountId } from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const useReceiveAddress = () => {
  // Hooks
  const wallet = useWallet().state.wallet

  // Selectors
  const buyAssetAccountId = useSwapperStore(selectBuyAssetAccountId)
  const updateReceiveAddress = useSwapperStore(state => state.updateReceiveAddress)
  const buyAsset = useSwapperStore(selectBuyAsset)
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
    if (!buyAsset) return
    ;(async () => {
      try {
        const receiveAddress = await getReceiveAddressFromBuyAsset(buyAsset)
        updateReceiveAddress(receiveAddress)
      } catch (e) {
        updateReceiveAddress(undefined)
      }
    })()
  }, [buyAsset, getReceiveAddressFromBuyAsset, updateReceiveAddress])

  return { getReceiveAddressFromBuyAsset }
}
