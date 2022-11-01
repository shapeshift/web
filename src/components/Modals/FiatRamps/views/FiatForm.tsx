import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { isEmpty } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { parseAddressInput } from 'lib/address/address'
import { logger } from 'lib/logger'
import { selectPortfolioAccountIds, selectPortfolioAccountMetadata } from 'state/slices/selectors'
import type { Nullable } from 'types/common'

import type { FiatRampAction } from '../FiatRampsCommon'
import type { AddressesByAccountId } from './Manager'
import { Overview } from './Overview'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'Views', 'Manager'],
})

type FiatFormProps = {
  handleIsSelectingAsset: (fiatRampAction: FiatRampAction) => void
  assetId?: AssetId
  fiatRampAction?: FiatRampAction
}

export const FiatForm: React.FC<FiatFormProps> = ({
  handleIsSelectingAsset,
  assetId = ethAssetId,
  fiatRampAction,
}) => {
  const portfolioAccountIds = useSelector(selectPortfolioAccountIds)
  const portfolioAccountMetadata = useSelector(selectPortfolioAccountMetadata)
  const [accountId, setAccountId] = useState<Nullable<AccountId>>(null)
  const [addressByAccountId, setAddressByAccountId] = useState<AddressesByAccountId>({})

  const {
    state: { wallet },
  } = useWallet()

  /**
   * preload all addresses, and reverse resolved vanity addresses for all account ids
   */
  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      const plainAddressResults = await Promise.allSettled(
        portfolioAccountIds.map(accountId => {
          const accountMetadata = portfolioAccountMetadata[accountId]
          const { accountType, bip44Params } = accountMetadata
          moduleLogger.trace({ fn: 'getAddress' }, 'Getting Addresses...')
          const payload = { accountType, bip44Params, wallet }
          const { chainId } = fromAccountId(accountId)
          const maybeAdapter = getChainAdapterManager().get(chainId)
          if (!maybeAdapter) return Promise.resolve(`no chain adapter for ${chainId}`)
          return maybeAdapter.getAddress(payload)
        }),
      )
      const plainAddresses = plainAddressResults.reduce<(string | undefined)[]>((acc, result) => {
        if (result.status === 'rejected') {
          moduleLogger.error(result.reason, 'failed to get address')
          acc.push(undefined) // keep same length of accumulator
          return acc
        }
        acc.push(result.value)
        return acc
      }, [])

      const parsedAddressResults = await Promise.allSettled(
        plainAddresses.map((value, idx) => {
          if (!value) return Promise.resolve({ address: '', vanityAddress: '' })
          const { chainId } = fromAccountId(portfolioAccountIds[idx])
          return parseAddressInput({ chainId, value })
        }),
      )

      const addressesByAccountId = parsedAddressResults.reduce<AddressesByAccountId>(
        (acc, parsedAddressResult, idx) => {
          if (parsedAddressResult.status === 'rejected') return acc
          const accountId = portfolioAccountIds[idx]
          const { value } = parsedAddressResult
          acc[accountId] = value
          return acc
        },
        {},
      )

      setAddressByAccountId(addressesByAccountId)
    })()
  }, [portfolioAccountIds, portfolioAccountMetadata, wallet])

  const { address, vanityAddress } = useMemo(() => {
    const empty = { address: '', vanityAddress: '' }
    if (isEmpty(addressByAccountId)) return empty
    if (!accountId) return empty
    const address = addressByAccountId[accountId]?.address ?? ''
    const vanityAddress = addressByAccountId[accountId]?.vanityAddress ?? ''
    return { address, vanityAddress }
  }, [addressByAccountId, accountId])

  return (
    <Overview
      assetId={assetId}
      handleIsSelectingAsset={handleIsSelectingAsset}
      defaultAction={fiatRampAction}
      address={address}
      vanityAddress={vanityAddress}
      handleAccountIdChange={setAccountId}
      accountId={accountId}
    />
  )
}
