import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useState } from 'react'
import type { GetReceiveAddressArgs } from 'components/MultiHopTrade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/portfolioSlice/selectors'
import { isUtxoAccountId } from 'state/slices/portfolioSlice/utils'
import {
  selectBuyAccountId,
  selectBuyAsset,
  selectManualReceiveAddress,
} from 'state/slices/swappersSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

const getReceiveAddress = async ({
  asset,
  wallet,
  accountMetadata,
}: GetReceiveAddressArgs): Promise<string | undefined> => {
  const { chainId } = fromAssetId(asset.assetId)
  const { accountType, bip44Params } = accountMetadata
  const chainAdapter = getChainAdapterManager().get(chainId)
  if (!(chainAdapter && wallet)) return
  const { accountNumber } = bip44Params
  try {
    return await chainAdapter.getAddress({ wallet, accountNumber, accountType })
  } catch (e) {
    console.log(e)
  }
}

export const useReceiveAddress = () => {
  // Hooks
  const wallet = useWallet().state.wallet
  const dispatch = useAppDispatch()
  // TODO: this should live in redux
  const [receiveAddress, setReceiveAddress] = useState<string | undefined>(undefined)

  // Selectors
  const buyAsset = useAppSelector(selectBuyAsset)
  const buyAccountId = useAppSelector(selectBuyAccountId)
  const buyAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, { accountId: buyAccountId }),
  )
  const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)

  const getReceiveAddressFromBuyAsset = useCallback(
    async (buyAsset: Asset) => {
      if (!buyAccountId) return
      if (!buyAccountMetadata) return
      if (isUtxoAccountId(buyAccountId) && !buyAccountMetadata.accountType)
        throw new Error(`Missing accountType for UTXO account ${buyAccountId}`)
      const buyAssetChainId = buyAsset.chainId
      const buyAssetAccountChainId = fromAccountId(buyAccountId).chainId
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
    [buyAccountId, buyAccountMetadata, wallet],
  )

  // Set the receiveAddress when the buy asset changes
  useEffect(() => {
    if (!buyAsset) return
    ;(async () => {
      try {
        const updatedReceiveAddress = await getReceiveAddressFromBuyAsset(buyAsset)
        setReceiveAddress(updatedReceiveAddress)
      } catch (e) {
        console.error(e)
        setReceiveAddress(undefined)
      }
    })()
  }, [buyAsset, dispatch, getReceiveAddressFromBuyAsset, setReceiveAddress])

  // Always use the manual receive address if it is set
  return manualReceiveAddress || receiveAddress
}
