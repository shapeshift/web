import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GetReceiveAddressArgs } from 'components/MultiHopTrade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isUtxoAccountId } from 'lib/utils/utxo'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/portfolioSlice/selectors'
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
  buyAccountId,
  buyAsset,
}: {
  fetchUnchainedAddress: boolean | undefined
  buyAccountId: AccountId | undefined
  buyAsset: Asset | undefined
}) => {
  // Hooks
  const wallet = useWallet().state.wallet
  // TODO: this should live in redux
  const [walletReceiveAddress, setWalletReceiveAddress] = useState<string | undefined>(undefined)

  // Selectors
  const buyAccountMetadataFilter = useMemo(() => ({ accountId: buyAccountId }), [buyAccountId])
  const buyAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, buyAccountMetadataFilter),
  )

  const getReceiveAddressFromBuyAsset = useCallback(
    async (buyAsset: Asset) => {
      if (!wallet) {
        return
      }
      if (!buyAccountId) {
        return
      }
      if (!buyAccountMetadata) {
        return
      }
      if (isUtxoAccountId(buyAccountId) && !buyAccountMetadata.accountType)
        throw new Error(`Missing accountType for UTXO account ${buyAccountId}`)
      const buyAssetChainId = buyAsset.chainId
      const buyAssetAccountChainId = fromAccountId(buyAccountId).chainId
      /**
       * do NOT remove
       * super dangerous - don't use the wrong bip44 params to generate receive addresses
       */
      if (buyAssetChainId !== buyAssetAccountChainId) {
        return
      }
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
  return { walletReceiveAddress }
}
