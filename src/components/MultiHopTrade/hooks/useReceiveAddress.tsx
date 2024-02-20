import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GetReceiveAddressArgs } from 'components/MultiHopTrade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAccountNumberByAccountId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/portfolioSlice/selectors'
import { isUtxoAccountId } from 'state/slices/portfolioSlice/utils'
import {
  selectFirstHopSellAccountId,
  selectInputBuyAsset,
  selectLastHopBuyAccountId,
  selectManualReceiveAddress,
} from 'state/slices/tradeInputSlice/selectors'
import { useAppSelector } from 'state/store'

export const getReceiveAddress = async ({
  asset,
  wallet,
  accountMetadata,
  pubKey,
}: GetReceiveAddressArgs): Promise<string | undefined> => {
  const { chainId } = fromAssetId(asset.assetId)
  const { accountType, bip44Params } = accountMetadata
  const chainAdapter = getChainAdapterManager().get(chainId)
  if (!(chainAdapter && wallet)) return
  const { accountNumber } = bip44Params
  const address = await chainAdapter.getAddress({ wallet, accountNumber, accountType, pubKey })
  return address
}

export const useReceiveAddress = ({
  fetchUnchainedAddress,
}: { fetchUnchainedAddress?: boolean } = {}) => {
  // Hooks
  const wallet = useWallet().state.wallet
  // TODO: this should live in redux
  const [walletReceiveAddress, setWalletReceiveAddress] = useState<string | undefined>(undefined)

  // Selectors
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAssetAccountId = useAppSelector(selectFirstHopSellAccountId)
  const sellAssetAccountNumberFilter = useMemo(
    () => ({ accountId: sellAssetAccountId }),
    [sellAssetAccountId],
  )
  const sellAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, sellAssetAccountNumberFilter),
  )

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdByAccountNumberAndChainId,
  )

  const maybeMatchingBuyAccountId = useMemo(() => {
    if (!buyAsset) return
    if (sellAssetAccountNumber === undefined) return
    return accountIdsByAccountNumberAndChainId[sellAssetAccountNumber]?.[buyAsset.chainId]
  }, [accountIdsByAccountNumberAndChainId, sellAssetAccountNumber, buyAsset])

  const buyAccountId = useAppSelector(state =>
    selectLastHopBuyAccountId(state, { accountId: maybeMatchingBuyAccountId }),
  )
  const buyAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, { accountId: buyAccountId }),
  )
  const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)

  const getReceiveAddressFromBuyAsset = useCallback(
    async (buyAsset: Asset) => {
      if (!wallet) return
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
        deviceId: await wallet.getDeviceID(),
        pubKey: fetchUnchainedAddress ? fromAccountId(buyAccountId).account : undefined,
      })
      return receiveAddress
    },
    [buyAccountId, buyAccountMetadata, fetchUnchainedAddress, wallet],
  )

  // Set the receiveAddress when the buy asset changes
  useEffect(() => {
    if (!buyAsset) return
    ;(async () => {
      try {
        const updatedReceiveAddress = await getReceiveAddressFromBuyAsset(buyAsset)
        setWalletReceiveAddress(updatedReceiveAddress)
      } catch (e) {
        console.error(e)
        setWalletReceiveAddress(undefined)
      }
    })()
  }, [buyAsset, getReceiveAddressFromBuyAsset])

  // Always use the manual receive address if it is set
  return { manualReceiveAddress, walletReceiveAddress }
}
