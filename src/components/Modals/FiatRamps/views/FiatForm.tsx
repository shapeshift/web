import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { ParseAddressInputReturn } from 'lib/address/address'
import { parseAddressInputWithChainId } from 'lib/address/address'
import type { Asset } from 'lib/asset-service'
import type { PartialRecord } from 'lib/utils'
import { useGetFiatRampsQuery } from 'state/apis/fiatRamps/fiatRamps'
import {
  selectAssetsSortedByMarketCapUserCurrencyBalanceAndName,
  selectPortfolioAccountMetadata,
  selectWalletAccountIds,
} from 'state/slices/selectors'

import { FiatRampAction } from '../FiatRampsCommon'
import { Overview } from './Overview'

type AddressesByAccountId = PartialRecord<AccountId, Partial<ParseAddressInputReturn>>

type FiatFormProps = {
  assetId: AssetId
  fiatRampAction: FiatRampAction
  accountId?: AccountId
}

export const FiatForm: React.FC<FiatFormProps> = ({
  assetId = ethAssetId,
  fiatRampAction,
  accountId: selectedAccountId,
}) => {
  const walletAccountIds = useSelector(selectWalletAccountIds)
  const portfolioAccountMetadata = useSelector(selectPortfolioAccountMetadata)
  const sortedAssets = useSelector(selectAssetsSortedByMarketCapUserCurrencyBalanceAndName)
  const [accountId, setAccountId] = useState<AccountId | undefined>(selectedAccountId)
  const [addressByAccountId, setAddressByAccountId] = useState<AddressesByAccountId>()
  const [selectedAssetId, setSelectedAssetId] = useState<AssetId>()

  const {
    state: { wallet, isDemoWallet },
  } = useWallet()

  const { data: ramps } = useGetFiatRampsQuery()
  const assetSearch = useModal('assetSearch')

  const buyAssets: Asset[] = useMemo(() => {
    const buyAssetIdsSet = new Set(ramps?.buyAssetIds ?? [])
    return sortedAssets.filter(asset => buyAssetIdsSet.has(asset.assetId))
  }, [ramps?.buyAssetIds, sortedAssets])

  const sellAssets: Asset[] = useMemo(() => {
    const sellAssetIdsSet = new Set(ramps?.sellAssetIds ?? [])
    return sortedAssets.filter(asset => sellAssetIdsSet.has(asset.assetId))
  }, [ramps?.sellAssetIds, sortedAssets])

  const handleIsSelectingAsset = useCallback(
    (fiatRampAction: FiatRampAction) => {
      if (!wallet) return

      assetSearch.open({
        onClick: (asset: Asset) => setSelectedAssetId(asset.assetId),
        assets: fiatRampAction === FiatRampAction.Buy ? buyAssets : sellAssets,
        disableUnsupported: true,
      })
    },
    [wallet, assetSearch, buyAssets, sellAssets],
  )

  /**
   * preload all addresses, and reverse resolved vanity addresses for all account ids
   */
  useEffect(() => {
    if (!wallet) return
    /**
     * important - don't even attempt to generate addresses for the demo wallet
     * we don't want users buying crypto into the demo wallet 🤦‍♂️
     */
    if (isDemoWallet) return
    ;(async () => {
      const plainAddressResults = await Promise.allSettled(
        walletAccountIds.map(accountId => {
          const accountMetadata = portfolioAccountMetadata[accountId]
          const { accountType, bip44Params } = accountMetadata
          const { accountNumber } = bip44Params
          const payload = { accountType, accountNumber, wallet }
          const { chainId } = fromAccountId(accountId)
          const maybeAdapter = getChainAdapterManager().get(chainId)
          if (!maybeAdapter) return Promise.resolve(`no chain adapter for ${chainId}`)
          return maybeAdapter.getAddress(payload)
        }),
      )
      const plainAddresses = plainAddressResults.reduce<(string | undefined)[]>((acc, result) => {
        if (result.status === 'rejected') {
          console.error(result.reason)
          acc.push(undefined) // keep same length of accumulator
          return acc
        }
        acc.push(result.value)
        return acc
      }, [])

      const parsedAddressResults = await Promise.allSettled(
        plainAddresses.map((value, idx) => {
          if (!value) return Promise.resolve({ address: '', vanityAddress: '' })
          const { chainId } = fromAccountId(walletAccountIds[idx])
          return parseAddressInputWithChainId({ chainId, urlOrAddress: value })
        }),
      )

      const addressesByAccountId = parsedAddressResults.reduce<AddressesByAccountId>(
        (acc, parsedAddressResult, idx) => {
          if (parsedAddressResult.status === 'rejected') return acc
          const accountId = walletAccountIds[idx]
          const { value } = parsedAddressResult
          acc[accountId] = value
          return acc
        },
        {},
      )

      setAddressByAccountId(addressesByAccountId)
    })()
  }, [isDemoWallet, walletAccountIds, portfolioAccountMetadata, wallet])

  const { address, vanityAddress } = useMemo(() => {
    const empty = { address: '', vanityAddress: '' }
    if (!addressByAccountId) return empty
    if (!accountId) return empty
    const address = addressByAccountId[accountId]?.address ?? ''
    const vanityAddress = addressByAccountId[accountId]?.vanityAddress ?? ''
    return { address, vanityAddress }
  }, [addressByAccountId, accountId])

  return (
    <Overview
      assetId={selectedAssetId ?? assetId}
      handleIsSelectingAsset={handleIsSelectingAsset}
      defaultAction={fiatRampAction}
      address={address}
      vanityAddress={vanityAddress}
      handleAccountIdChange={setAccountId}
      accountId={accountId}
    />
  )
}
