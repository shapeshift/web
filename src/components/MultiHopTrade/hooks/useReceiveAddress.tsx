import { fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccountIds } from 'components/MultiHopTrade/hooks/useAccountIds'
import { getReceiveAddress } from 'components/Trade/hooks/useSwapper/utils'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import {
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/portfolioSlice/selectors'
import { isUtxoAccountId } from 'state/slices/portfolioSlice/utils'
import { selectBuyAsset, selectSellAsset } from 'state/slices/swappersSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

export const useReceiveAddress = () => {
  // Hooks
  const wallet = useWallet().state.wallet
  const dispatch = useAppDispatch()
  const [receiveAddress, setReceiveAddress] = useState<string | undefined>(undefined)

  // Selectors
  const buyAsset = useAppSelector(selectBuyAsset)
  const sellAsset = useAppSelector(selectSellAsset)
  const { buyAssetAccountId } = useAccountIds({ sellAsset, buyAsset })
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
        const _receiveAddress = await getReceiveAddressFromBuyAsset(buyAsset)
        setReceiveAddress(_receiveAddress)
      } catch (e) {
        setReceiveAddress(undefined)
      }
    })()
  }, [buyAsset, dispatch, getReceiveAddressFromBuyAsset, setReceiveAddress])

  return receiveAddress
}
